import { NextRequest, NextResponse } from 'next/server'
import { and, isNotNull, ne, eq, lt, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tasks, clients } from '@/lib/db/schema'
import { getGHLTask, mapGHLStatusToLocal } from '@/lib/ghl/tasks'
import { GHLError } from '@/lib/ghl/client'

function validateCronAuth(req: NextRequest): boolean {
  return req.headers.get('authorization')?.replace('Bearer ', '') === process.env.CRON_SECRET
}

export async function POST(req: NextRequest) {
  if (!validateCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const result = { synced: 0, updated: 0, errors: [] as string[], executionMs: 0 }

  // Obtener tareas activas que tienen ghlTaskId
  const activeTasks = await db
    .select({
      id: tasks.id,
      ghlTaskId: tasks.ghlTaskId,
      status: tasks.status,
      clientId: tasks.clientId,
      ghlContactId: clients.ghlContactId,
    })
    .from(tasks)
    .innerJoin(clients, eq(tasks.clientId, clients.id))
    .where(and(
      isNotNull(tasks.ghlTaskId),
      ne(tasks.status, 'completed')
    ))

  console.log(`[CRON] sync-ghl-tasks — ${activeTasks.length} tareas a sincronizar`)

  for (const task of activeTasks) {
    try {
      if (!task.ghlContactId) { result.synced++; continue }
      const ghlTask = await getGHLTask(task.ghlContactId, task.ghlTaskId!)
      if (!ghlTask) { result.synced++; continue }

      const newStatus = mapGHLStatusToLocal(ghlTask.completed)

      if (newStatus !== task.status && task.status !== 'in_progress') {
        await db.update(tasks).set({
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date() : null,
          updatedAt: new Date(),
        }).where(eq(tasks.id, task.id))
        result.updated++
      }

      result.synced++
    } catch (err) {
      const msg = err instanceof GHLError ? `GHL ${err.status}: ${err.message}` : String(err)
      console.error(`[CRON] Error sincronizando tarea ${task.id}: ${msg}`)
      result.errors.push(`Tarea ${task.id}: ${msg}`)
    }
  }

  // Marcar tareas vencidas (dueDate < hoy y aún pending/in_progress)
  const todayStr = new Date().toISOString().split('T')[0]
  const overdueMark = await db
    .update(tasks)
    .set({ status: 'overdue', updatedAt: new Date() })
    .where(and(isNotNull(tasks.dueDate), lt(tasks.dueDate, todayStr), or(eq(tasks.status, 'pending'), eq(tasks.status, 'in_progress'))))
    .returning({ id: tasks.id })
  if (overdueMark.length > 0) console.log(`[CRON] ${overdueMark.length} tareas marcadas como vencidas`)

  result.executionMs = Date.now() - startTime
  console.log(`[CRON] Sync completado — actualizadas: ${result.updated}/${result.synced}`)
  return NextResponse.json(result)
}
