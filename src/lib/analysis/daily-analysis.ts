import { eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients, users, tasks, conversationSnapshots, aiTokenUsage } from '@/lib/db/schema'
import { getContactDisplayName, getUnitedDraftClients, hasValidClientPrefix } from '@/lib/ghl/contacts'
import { getContactConversation, getConversationMessages, formatMessagesForClaude } from '@/lib/ghl/conversations'
import { createGHLTask } from '@/lib/ghl/tasks'
import { analyzeConversation } from '@/lib/ai/analyze-conversation'
import { routeTaskSync } from '@/lib/routing/task-router'
import { GHLError } from '@/lib/ghl/client'

const LOCATION_ID = process.env.GHL_LOCATION_ID!

// Prefijos válidos para auto-registrar nuevos grupos GHL (fuente única en contacts.ts)
const hasValidPrefix = hasValidClientPrefix

export interface JobResult {
  processed: number
  tasksCreated: number
  skipped: number
  errors: Array<{ client: string; error: string }>
  executionMs: number
}

// Lock en memoria: evita que dos disparos (scheduler + endpoint) corran a la vez.
let running = false
export function isAnalysisRunning() {
  return running
}

/**
 * Lee las conversaciones de GHL, extrae tareas con Claude y las crea/asigna.
 * Es el pipeline CRM → tareas. Idempotente vía conversationSnapshots
 * (solo procesa mensajes más nuevos que el último visto), así que correrlo
 * dos veces seguidas no duplica tareas.
 */
export async function runDailyAnalysis(): Promise<JobResult> {
  const startTime = Date.now()
  const result: JobResult = { processed: 0, tasksCreated: 0, skipped: 0, errors: [], executionMs: 0 }

  if (running) {
    console.log('[ANALYSIS] Ya hay una corrida en curso — se omite este disparo')
    return result
  }
  running = true

  console.log('[ANALYSIS] analyze-conversations — iniciando job')

  try {
    const allUsers = await db.select().from(users)
    const usersByName = Object.fromEntries(allUsers.map((u) => [u.name, u.id]))

    // Auto-discovery: sincronizar nuevos clientes GHL
    await syncNewGHLClients(allUsers)

    console.log('[ANALYSIS] Cargando clientes desde DB...')
    const dbClients = await db.select().from(clients).where(isNotNull(clients.ghlContactId))
    console.log(`[ANALYSIS] ${dbClients.length} clientes a procesar`)

    if (dbClients.length === 0) {
      console.log('[ANALYSIS] No hay clientes con ghlContactId en la DB')
      return result
    }

    for (let i = 0; i < dbClients.length; i++) {
      const dbClient = dbClients[i]
      const contactName = dbClient.name

      // Respetar rate limits de GHL: 1.5s entre clientes, 5s cada 10 clientes
      if (i > 0) {
        await new Promise((r) => setTimeout(r, i % 10 === 0 ? 5000 : 1500))
      }

      try {
        console.log(`[ANALYSIS] Procesando [${i + 1}/${dbClients.length}]: ${contactName}`)

        const [snapshot] = await db
          .select()
          .from(conversationSnapshots)
          .where(eq(conversationSnapshots.clientId, dbClient.id))
          .limit(1)

        const conversation = await getContactConversation(LOCATION_ID, dbClient.ghlContactId!)
        if (!conversation) {
          console.log(`[ANALYSIS] ${contactName}: sin conversación activa`)
          result.skipped++
          continue
        }

        const { messages } = await getConversationMessages(conversation.id)

        let newMessages = messages
        if (snapshot?.lastMessageId) {
          const lastIdx = messages.findIndex((m) => m.id === snapshot.lastMessageId)
          if (lastIdx !== -1) newMessages = messages.slice(0, lastIdx)
        }

        if (newMessages.length === 0) {
          console.log(`[ANALYSIS] ${contactName}: sin mensajes nuevos`)
          result.skipped++
          await upsertSnapshot(dbClient.id, conversation.id, snapshot?.lastMessageId ?? null)
          continue
        }

        console.log(`[ANALYSIS] ${contactName}: ${newMessages.length} mensajes nuevos → Claude`)

        const formatted = formatMessagesForClaude(newMessages)
        const analysis = await analyzeConversation(contactName, formatted)

        await db
          .insert(aiTokenUsage)
          .values({
            jobType: 'analyze-conversations',
            clientId: dbClient.id,
            inputTokens: analysis.tokenUsage.inputTokens,
            outputTokens: analysis.tokenUsage.outputTokens,
            cacheCreationTokens: analysis.tokenUsage.cacheCreationTokens,
            cacheReadTokens: analysis.tokenUsage.cacheReadTokens,
            model: analysis.tokenUsage.model,
          })
          .catch((err) => console.error('[ANALYSIS] Error registrando tokens:', err))

        console.log(`[ANALYSIS] ${contactName}: ${analysis.tasks.length} tarea(s) detectada(s)`)

        for (const extracted of analysis.tasks) {
          try {
            const routing = routeTaskSync(
              {
                taskTitle: extracted.title,
                taskDescription: extracted.description,
                taskType: extracted.taskType,
                clientAssignedAdvisorId: dbClient.assignedAdvisorId,
              },
              usersByName
            )

            const assignedUser = allUsers.find((u) => u.id === routing.userId)
            const ghlAssignedUserId = assignedUser?.ghlUserId ?? undefined

            const [createdTask] = await db
              .insert(tasks)
              .values({
                title: extracted.title,
                description: extracted.description,
                clientId: dbClient.id,
                assignedToId: routing.userId,
                status: 'pending',
                source: 'ai_generated',
                conversationId: conversation.id,
                dueDate: extracted.dueDate ?? undefined,
              })
              .returning()

            let ghlTaskId: string | null = null
            try {
              ghlTaskId = await createGHLTask({
                title: extracted.title,
                description: extracted.description,
                dueDate: extracted.dueDate ?? undefined,
                contactId: dbClient.ghlContactId!,
                assignedUserId: ghlAssignedUserId,
              })
            } catch (ghlErr) {
              const errMsg = ghlErr instanceof GHLError ? ghlErr.message : String(ghlErr)
              console.error(`[ANALYSIS] ${contactName}: error creando tarea en GHL: ${errMsg}`)
            }

            if (ghlTaskId) {
              await db.update(tasks).set({ ghlTaskId }).where(eq(tasks.id, createdTask.id))
            }

            result.tasksCreated++
            console.log(`[ANALYSIS] ✓ Tarea creada: "${extracted.title}" → ${routing.advisorName} (${routing.source})`)
          } catch (taskErr) {
            const errMsg = taskErr instanceof Error ? taskErr.message : String(taskErr)
            console.error(`[ANALYSIS] Error creando tarea "${extracted.title}": ${errMsg}`)
            result.errors.push({ client: contactName, error: `Tarea "${extracted.title}": ${errMsg}` })
          }
        }

        const newestMessageId = messages[0]?.id ?? snapshot?.lastMessageId ?? null
        await upsertSnapshot(dbClient.id, conversation.id, newestMessageId)

        result.processed++
      } catch (clientErr) {
        const errMsg = clientErr instanceof Error ? clientErr.message : String(clientErr)
        console.error(`[ANALYSIS] Error procesando ${contactName}: ${errMsg}`)
        result.errors.push({ client: contactName, error: errMsg })
      }
    }
  } catch (fatalErr) {
    const errMsg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr)
    console.error('[ANALYSIS] Error fatal en job:', errMsg)
  } finally {
    running = false
  }

  result.executionMs = Date.now() - startTime
  console.log(
    `[ANALYSIS] Completado en ${result.executionMs}ms — procesados: ${result.processed}, tareas: ${result.tasksCreated}, errores: ${result.errors.length}`
  )
  return result
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function syncNewGHLClients(allUsers: Array<{ id: string; role: string }>) {
  try {
    const ghlContacts = await getUnitedDraftClients(LOCATION_ID)
    const dbClients = await db.select({ ghlContactId: clients.ghlContactId }).from(clients)
    const existingIds = new Set(dbClients.map((c) => c.ghlContactId))

    const defaultAdvisorId = allUsers.find((u) => u.role === 'manager')?.id ?? allUsers[0]?.id
    if (!defaultAdvisorId) return

    for (const contact of ghlContacts) {
      if (existingIds.has(contact.id)) continue

      const displayName = getContactDisplayName(contact)
      if (!hasValidPrefix(displayName)) {
        console.log(`[ANALYSIS] Nuevo contacto GHL ignorado (sin prefijo válido): "${displayName}"`)
        continue
      }

      await db
        .insert(clients)
        .values({ name: displayName, ghlContactId: contact.id, assignedAdvisorId: defaultAdvisorId })
        .onConflictDoNothing()

      console.log(`[ANALYSIS] ✓ Nuevo cliente auto-registrado: "${displayName}"`)
    }
  } catch (err) {
    console.error('[ANALYSIS] Error en auto-discovery de clientes:', err instanceof Error ? err.message : err)
  }
}

async function upsertSnapshot(clientId: string, conversationId: string, lastMessageId: string | null) {
  await db
    .insert(conversationSnapshots)
    .values({ clientId, ghlConversationId: conversationId, lastMessageId: lastMessageId ?? undefined })
    .onConflictDoUpdate({
      target: conversationSnapshots.ghlConversationId,
      set: { lastProcessedAt: new Date(), lastMessageId: lastMessageId ?? undefined },
    })
}
