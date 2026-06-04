import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { tasks, clients, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  clientId: z.string().uuid(),
  assignedToId: z.string().uuid(),
  dueDate: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      source: tasks.source,
      dueDate: tasks.dueDate,
      conversationId: tasks.conversationId,
      ghlTaskId: tasks.ghlTaskId,
      assignedAt: tasks.assignedAt,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      client: { id: clients.id, name: clients.name, ghlContactId: clients.ghlContactId },
      assignedTo: { id: users.id, name: users.name, email: users.email },
    })
    .from(tasks)
    .innerJoin(clients, eq(tasks.clientId, clients.id))
    .innerJoin(users, eq(tasks.assignedToId, users.id))
    .orderBy(desc(tasks.createdAt))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { title, description, clientId, assignedToId, dueDate } = parsed.data

  const [created] = await db
    .insert(tasks)
    .values({
      title,
      description,
      clientId,
      assignedToId,
      status: 'pending',
      source: 'manual',
      dueDate,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
