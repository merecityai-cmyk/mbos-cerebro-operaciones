import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { taskAuditLog, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const logs = await db
    .select({
      id: taskAuditLog.id,
      field: taskAuditLog.field,
      oldValue: taskAuditLog.oldValue,
      newValue: taskAuditLog.newValue,
      createdAt: taskAuditLog.createdAt,
      userName: users.name,
    })
    .from(taskAuditLog)
    .innerJoin(users, eq(taskAuditLog.userId, users.id))
    .where(eq(taskAuditLog.taskId, id))
    .orderBy(desc(taskAuditLog.createdAt))

  return NextResponse.json(logs)
}
