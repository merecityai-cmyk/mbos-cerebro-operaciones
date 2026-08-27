import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { and, lt, or, eq, isNotNull } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'

// Marks tasks whose dueDate is in the past and are still pending/in_progress as overdue.
// Can be called by any authenticated user (manual trigger) or by CRON.
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = authHeader?.replace('Bearer ', '')
  const isCron = cronSecret === process.env.CRON_SECRET

  if (!isCron) {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const updated = await db
    .update(tasks)
    .set({ status: 'overdue', updatedAt: new Date() })
    .where(and(
      isNotNull(tasks.dueDate),
      lt(tasks.dueDate, todayStr),
      or(eq(tasks.status, 'pending'), eq(tasks.status, 'in_progress'))
    ))
    .returning({ id: tasks.id })

  console.log(`[mark-overdue] ${updated.length} tareas marcadas como vencidas`)
  return NextResponse.json({ marked: updated.length })
}
