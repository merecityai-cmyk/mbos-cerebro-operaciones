import { NextRequest, NextResponse } from 'next/server'
import { eq, and, gte, lte, count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients, users, tasks, weeklyReports } from '@/lib/db/schema'
import { getContactConversation, getConversationMessages, formatMessagesForClaude } from '@/lib/ghl/conversations'
import { analyzeSatisfaction } from '@/lib/ai/analyze-satisfaction'
import { getColombiaDate, startOfWeek, endOfWeek, toDateString, subtractDays } from '@/lib/utils/dates'
import { GHLError } from '@/lib/ghl/client'

const LOCATION_ID = process.env.GHL_LOCATION_ID!

function validateCronAuth(req: NextRequest): boolean {
  return req.headers.get('authorization')?.replace('Bearer ', '') === process.env.CRON_SECRET
}

export async function POST(req: NextRequest) {
  if (!validateCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const now = getColombiaDate()
  // Reportar la semana anterior (el job corre los lunes)
  const reportDate = subtractDays(now, 7)
  const weekStart = startOfWeek(reportDate)
  const weekEnd = endOfWeek(reportDate)
  const weekStartStr = toDateString(weekStart)
  const weekEndStr = toDateString(weekEnd)

  console.log(`[CRON] generate-reports — semana ${weekStartStr} a ${weekEndStr}`)

  const result = {
    reportsGenerated: 0,
    skipped: 0,
    errors: [] as Array<{ client: string; error: string }>,
    executionMs: 0,
  }

  try {
    const allClients = await db
      .select({ id: clients.id, name: clients.name, ghlContactId: clients.ghlContactId })
      .from(clients)

    for (const client of allClients) {
      try {
        // Evitar duplicar reportes ya generados
        const [existing] = await db
          .select({ id: weeklyReports.id })
          .from(weeklyReports)
          .where(and(
            eq(weeklyReports.clientId, client.id),
            eq(weeklyReports.weekStart, weekStartStr)
          ))
          .limit(1)

        if (existing) {
          result.skipped++
          continue
        }

        // Métricas de tareas de la semana
        const [total] = await db.select({ count: count() }).from(tasks)
          .where(and(eq(tasks.clientId, client.id), gte(tasks.createdAt, weekStart), lte(tasks.createdAt, weekEnd)))
        const [completed] = await db.select({ count: count() }).from(tasks)
          .where(and(eq(tasks.clientId, client.id), eq(tasks.status, 'completed'), gte(tasks.createdAt, weekStart), lte(tasks.createdAt, weekEnd)))
        const [overdue] = await db.select({ count: count() }).from(tasks)
          .where(and(eq(tasks.clientId, client.id), eq(tasks.status, 'overdue'), gte(tasks.createdAt, weekStart), lte(tasks.createdAt, weekEnd)))
        const [pending] = await db.select({ count: count() }).from(tasks)
          .where(and(eq(tasks.clientId, client.id), eq(tasks.status, 'pending'), gte(tasks.createdAt, weekStart), lte(tasks.createdAt, weekEnd)))

        const stats = {
          tasksTotal: total.count,
          tasksCompleted: completed.count,
          tasksOverdue: overdue.count,
          tasksPending: pending.count,
        }

        // Obtener conversación de la semana desde GHL
        let conversationText = ''
        try {
          const conversation = client.ghlContactId ? await getContactConversation(LOCATION_ID, client.ghlContactId) : null
          if (conversation) {
            const { messages } = await getConversationMessages(conversation.id)
            // Filtrar solo mensajes de la semana reportada
            const weekMessages = messages.filter((m) => {
              const d = new Date(m.dateAdded ?? m.createdAt)
              return d >= weekStart && d <= weekEnd
            })
            conversationText = formatMessagesForClaude(weekMessages)
          }
        } catch (ghlErr) {
          const msg = ghlErr instanceof GHLError ? ghlErr.message : String(ghlErr)
          console.warn(`[CRON] ${client.name}: no se pudo obtener conversación GHL: ${msg}`)
        }

        // Analizar con Claude
        const analysis = await analyzeSatisfaction(client.name, conversationText, stats)
        const completionRate = stats.tasksTotal > 0
          ? (stats.tasksCompleted / stats.tasksTotal) * 100
          : 0

        // Guardar reporte
        await db.insert(weeklyReports).values({
          clientId: client.id,
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          satisfactionLevel: analysis.satisfactionLevel,
          satisfactionScore: analysis.satisfactionScore,
          satisfactionReasoning: analysis.reasoning,
          tasksTotal: stats.tasksTotal,
          tasksCompleted: stats.tasksCompleted,
          tasksOverdue: stats.tasksOverdue,
          tasksPending: stats.tasksPending,
          completionRate: completionRate.toFixed(2),
          conversationSummary: analysis.conversationSummary,
          keyTopics: analysis.keyTopics,
        })

        result.reportsGenerated++
        console.log(`[CRON] ✓ ${client.name}: score ${analysis.satisfactionScore}/10 (${analysis.satisfactionLevel})`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[CRON] Error generando reporte para ${client.name}: ${msg}`)
        result.errors.push({ client: client.name, error: msg })
      }
    }
  } catch (fatalErr) {
    const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr)
    return NextResponse.json({ error: 'Job failed', detail: msg, ...result }, { status: 500 })
  }

  result.executionMs = Date.now() - startTime
  console.log(`[CRON] Reportes completados en ${result.executionMs}ms`)
  return NextResponse.json(result)
}
