import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { tasks, clients, users, taskAuditLog } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { updateGHLTaskStatus, updateGHLTaskAssignee } from '@/lib/ghl/tasks'
import { GHLError } from '@/lib/ghl/client'

const patchSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue']).optional(),
  assignedToId: z.string().uuid().optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [row] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      source: tasks.source,
      dueDate: tasks.dueDate,
      ghlTaskId: tasks.ghlTaskId,
      conversationId: tasks.conversationId,
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
    .where(eq(tasks.id, id))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { status, assignedToId, dueDate, notes, title, description } = parsed.data

  // Obtener tarea actual para el sync con GHL
  const [currentTask] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1)

  if (!currentTask) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Construir el update
  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (status !== undefined) {
    updateData.status = status
    if (status === 'completed') updateData.completedAt = new Date()
    else updateData.completedAt = null
  }
  if (assignedToId !== undefined) updateData.assignedToId = assignedToId
  if (dueDate !== undefined) updateData.dueDate = dueDate
  if (notes !== undefined) updateData.notes = notes
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description

  // Actualizar en DB
  const [updated] = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, id))
    .returning()

  // Audit log — registrar cambios de estado y asignado
  const actorId = session.user.id as string
  if (status !== undefined && status !== currentTask.status) {
    await db.insert(taskAuditLog).values({
      taskId: id,
      userId: actorId,
      field: 'status',
      oldValue: currentTask.status,
      newValue: status,
    })
  }
  if (assignedToId !== undefined && assignedToId !== currentTask.assignedToId) {
    const [oldUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, currentTask.assignedToId)).limit(1)
    const [newUser2] = await db.select({ name: users.name }).from(users).where(eq(users.id, assignedToId)).limit(1)
    await db.insert(taskAuditLog).values({
      taskId: id,
      userId: actorId,
      field: 'assignedTo',
      oldValue: oldUser?.name ?? currentTask.assignedToId,
      newValue: newUser2?.name ?? assignedToId,
    })
  }

  // Sincronizar con GHL (no-throw — si GHL falla, la DB queda actualizada)
  if (currentTask.ghlTaskId && currentTask.clientId) {
    const [clientRow] = await db
      .select({ ghlContactId: clients.ghlContactId })
      .from(clients)
      .where(eq(clients.id, currentTask.clientId))
      .limit(1)

    if (clientRow?.ghlContactId) {
      try {
        if (status !== undefined) {
          await updateGHLTaskStatus(
            clientRow.ghlContactId,
            currentTask.ghlTaskId,
            status === 'completed'
          )
        }
        if (assignedToId !== undefined) {
          const [newUser] = await db
            .select({ ghlUserId: users.ghlUserId })
            .from(users)
            .where(eq(users.id, assignedToId))
            .limit(1)

          if (newUser?.ghlUserId) {
            await updateGHLTaskAssignee(
              clientRow.ghlContactId,
              currentTask.ghlTaskId,
              newUser.ghlUserId
            )
          }
        }
      } catch (ghlErr) {
        const msg = ghlErr instanceof GHLError ? ghlErr.message : String(ghlErr)
        console.error(`[API] Error sincronizando tarea ${id} con GHL: ${msg}`)
        // No retornar error — la DB ya fue actualizada exitosamente
      }
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(tasks).where(eq(tasks.id, id))
  return NextResponse.json({ success: true })
}
