import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { tasks, clients, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import type { TaskWithRelations } from '@/types'

export default async function TasksPage() {
  await requireSession()

  // Query directa a DB — sin API route innecesaria
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      source: tasks.source,
      dueDate: tasks.dueDate,
      notes: tasks.notes,
      conversationId: tasks.conversationId,
      ghlTaskId: tasks.ghlTaskId,
      assignedAt: tasks.assignedAt,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      client: {
        id: clients.id,
        name: clients.name,
        ghlContactId: clients.ghlContactId,
      },
      assignedTo: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(tasks)
    .innerJoin(clients, eq(tasks.clientId, clients.id))
    .innerJoin(users, eq(tasks.assignedToId, users.id))
    // Primero vencidas, luego por fecha límite más próxima, luego por creación
    .orderBy(tasks.dueDate, desc(tasks.createdAt))

  const advisors = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .orderBy(users.name)

  const allClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .orderBy(clients.name)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[#0F172A]">Tareas</h2>
        <p className="text-sm text-[#64748B] mt-0.5">
          {rows.length} tarea{rows.length !== 1 ? 's' : ''} en total
        </p>
      </div>

      <TaskBoard
        initialTasks={rows as TaskWithRelations[]}
        advisors={advisors}
        clients={allClients}
      />
    </div>
  )
}
