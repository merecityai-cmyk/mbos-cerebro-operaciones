import { NextRequest, NextResponse } from 'next/server'
import { eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients, users, tasks, conversationSnapshots } from '@/lib/db/schema'
import { getContactDisplayName } from '@/lib/ghl/contacts'
import { getContactConversation, getConversationMessages, formatMessagesForClaude } from '@/lib/ghl/conversations'
import { createGHLTask } from '@/lib/ghl/tasks'
import { analyzeConversation } from '@/lib/ai/analyze-conversation'
import { routeTaskSync } from '@/lib/routing/task-router'
import { GHLError } from '@/lib/ghl/client'

const LOCATION_ID = process.env.GHL_LOCATION_ID!

// ─── Auth del cron ─────────────────────────────────────────────────────────

function validateCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.CRON_SECRET
}

// ─── Tipos internos ─────────────────────────────────────────────────────────

interface JobResult {
  processed: number
  tasksCreated: number
  skipped: number
  errors: Array<{ client: string; error: string }>
  executionMs: number
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Validar autenticación — primer check, antes de tocar DB o GHL
  if (!validateCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const result: JobResult = {
    processed: 0,
    tasksCreated: 0,
    skipped: 0,
    errors: [],
    executionMs: 0,
  }

  console.log('[CRON] analyze-conversations — iniciando job diario')

  try {
    // 2. Pre-cargar usuarios de la DB (para routing sin N+1 queries)
    const allUsers = await db.select().from(users)
    const usersByName = Object.fromEntries(allUsers.map((u) => [u.name, u.id]))
    const usersByGhlId = Object.fromEntries(
      allUsers
        .filter((u) => u.ghlUserId)
        .map((u) => [u.ghlUserId!, u])
    )

    // 3. Cargar clientes directamente desde la DB (ya tienen ghlContactId real)
    console.log('[CRON] Cargando clientes desde DB...')
    const dbClients = await db
      .select()
      .from(clients)
      .where(isNotNull(clients.ghlContactId))

    console.log(`[CRON] ${dbClients.length} clientes a procesar`)

    if (dbClients.length === 0) {
      return NextResponse.json({
        ...result,
        message: 'No hay clientes con ghlContactId en la DB',
        executionMs: Date.now() - startTime,
      })
    }

    // 4. Procesar cada cliente — try/catch individual para resiliencia
    for (const dbClient of dbClients) {
      const contactName = dbClient.name

      try {
        console.log(`[CRON] Procesando: ${contactName} (${dbClient.ghlContactId})`)

        // Obtener snapshot anterior
        const [snapshot] = await db
          .select()
          .from(conversationSnapshots)
          .where(eq(conversationSnapshots.clientId, dbClient.id))
          .limit(1)

        // Obtener conversación activa en GHL
        const conversation = await getContactConversation(LOCATION_ID, dbClient.ghlContactId!)
        if (!conversation) {
          console.log(`[CRON] ${contactName}: sin conversación activa`)
          result.skipped++
          continue
        }

        // Obtener mensajes nuevos desde el último procesado
        const { messages, lastMessageId } = await getConversationMessages(
          conversation.id,
          snapshot?.lastMessageId ?? undefined
        )

        // Filtrar solo mensajes posteriores al último procesado
        let newMessages = messages
        if (snapshot?.lastMessageId) {
          const lastIdx = messages.findIndex((m) => m.id === snapshot.lastMessageId)
          if (lastIdx !== -1) {
            newMessages = messages.slice(lastIdx + 1)
          }
        }

        if (newMessages.length === 0) {
          console.log(`[CRON] ${contactName}: sin mensajes nuevos`)
          result.skipped++
          // Actualizar lastProcessedAt igual
          await upsertSnapshot(dbClient.id, conversation.id, snapshot?.lastMessageId ?? null)
          continue
        }

        console.log(`[CRON] ${contactName}: ${newMessages.length} mensajes nuevos → Claude`)

        // Analizar con Claude
        const formatted = formatMessagesForClaude(newMessages)
        const analysis = await analyzeConversation(contactName, formatted)

        console.log(`[CRON] ${contactName}: ${analysis.tasks.length} tarea(s) detectada(s)`)

        // Crear cada tarea en DB y GHL
        for (const extracted of analysis.tasks) {
          try {
            // Determinar asesora asignada con el router
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

            // Guardar en DB primero
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

            // Crear en GHL (si falla, la tarea queda en DB con ghlTaskId null)
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
              console.error(`[CRON] ${contactName}: error creando tarea en GHL: ${errMsg}`)
            }

            // Actualizar ghlTaskId si se creó exitosamente
            if (ghlTaskId) {
              await db
                .update(tasks)
                .set({ ghlTaskId })
                .where(eq(tasks.id, createdTask.id))
            }

            result.tasksCreated++
            console.log(
              `[CRON] ✓ Tarea creada: "${extracted.title}" → ${routing.advisorName} (${routing.source})`
            )
          } catch (taskErr) {
            const errMsg = taskErr instanceof Error ? taskErr.message : String(taskErr)
            console.error(`[CRON] Error creando tarea "${extracted.title}": ${errMsg}`)
            result.errors.push({
              client: contactName,
              error: `Tarea "${extracted.title}": ${errMsg}`,
            })
          }
        }

        // Actualizar snapshot con el último mensaje procesado
        await upsertSnapshot(
          dbClient.id,
          conversation.id,
          lastMessageId ?? snapshot?.lastMessageId ?? null
        )

        result.processed++
      } catch (clientErr) {
        // Un cliente que falla NO rompe el job — se loguea y continúa
        const errMsg = clientErr instanceof Error ? clientErr.message : String(clientErr)
        console.error(`[CRON] Error procesando ${contactName}: ${errMsg}`)
        result.errors.push({ client: contactName, error: errMsg })
      }
    }
  } catch (fatalErr) {
    const errMsg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr)
    console.error('[CRON] Error fatal en job:', errMsg)
    return NextResponse.json(
      { error: 'Job failed', detail: errMsg, ...result },
      { status: 500 }
    )
  }

  result.executionMs = Date.now() - startTime

  console.log(
    `[CRON] Completado en ${result.executionMs}ms — ` +
    `procesados: ${result.processed}, tareas: ${result.tasksCreated}, errores: ${result.errors.length}`
  )

  return NextResponse.json(result)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function upsertSnapshot(
  clientId: string,
  conversationId: string,
  lastMessageId: string | null
) {
  await db
    .insert(conversationSnapshots)
    .values({
      clientId,
      ghlConversationId: conversationId,
      lastMessageId: lastMessageId ?? undefined,
    })
    .onConflictDoUpdate({
      target: conversationSnapshots.ghlConversationId,
      set: {
        lastProcessedAt: new Date(),
        lastMessageId: lastMessageId ?? undefined,
      },
    })
}
