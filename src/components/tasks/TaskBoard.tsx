'use client'

import { useState, useOptimistic, useCallback } from 'react'
import { TaskColumn } from './TaskColumn'
import { TaskFilters } from './TaskFilters'
import { TaskDetailPanel } from './TaskDetailPanel'
import type { TaskWithRelations, TaskStatus } from '@/types'

const COLUMNS: TaskStatus[] = ['pending', 'in_progress', 'completed', 'overdue']

interface TaskBoardProps {
  initialTasks: TaskWithRelations[]
  advisors: Array<{ id: string; name: string }>
}

export function TaskBoard({ initialTasks, advisors }: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Optimistic updates — la UI actualiza inmediatamente, sin esperar la API
  const [optimisticTasks, updateOptimistic] = useOptimistic(
    initialTasks,
    (state: TaskWithRelations[], update: Partial<TaskWithRelations> & { id: string }) => {
      return state.map((t) =>
        t.id === update.id ? { ...t, ...update } : t
      )
    }
  )

  // Filtrar por asesor y búsqueda
  const filteredTasks = optimisticTasks.filter((t) => {
    const matchAdvisor = !selectedAdvisorId || t.assignedTo.id === selectedAdvisorId
    const matchSearch =
      !searchQuery ||
      t.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchAdvisor && matchSearch
  })

  // Agrupar por status
  const tasksByStatus = COLUMNS.reduce<Record<TaskStatus, TaskWithRelations[]>>(
    (acc, status) => {
      acc[status] = filteredTasks.filter((t) => t.status === status)
      return acc
    },
    { pending: [], in_progress: [], completed: [], overdue: [] }
  )

  const handleTaskClick = useCallback((task: TaskWithRelations) => {
    setSelectedTask(task)
    setPanelOpen(true)
  }, [])

  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskStatus) => {
      // 1. Actualizar optimisticamente
      updateOptimistic({ id: taskId, status })

      // 2. Actualizar el task seleccionado en el panel también
      setSelectedTask((prev) => (prev?.id === taskId ? { ...prev, status } : prev))

      // 3. Llamar a la API
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    },
    [updateOptimistic]
  )

  const handleAssigneeChange = useCallback(
    async (taskId: string, userId: string) => {
      const newAdvisor = advisors.find((a) => a.id === userId)
      if (!newAdvisor) return

      updateOptimistic({
        id: taskId,
        assignedTo: { id: userId, name: newAdvisor.name, email: '' },
      })
      setSelectedTask((prev) =>
        prev?.id === taskId
          ? { ...prev, assignedTo: { id: userId, name: newAdvisor.name, email: '' } }
          : prev
      )

      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: userId }),
      })
    },
    [advisors, updateOptimistic]
  )

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <TaskFilters
        advisors={advisors}
        selectedAdvisorId={selectedAdvisorId}
        searchQuery={searchQuery}
        onAdvisorChange={setSelectedAdvisorId}
        onSearchChange={setSearchQuery}
      />

      {/* Tablero Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {COLUMNS.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onTaskClick={handleTaskClick}
          />
        ))}
      </div>

      {/* Panel de detalle */}
      <TaskDetailPanel
        task={selectedTask}
        advisors={advisors}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onStatusChange={handleStatusChange}
        onAssigneeChange={handleAssigneeChange}
      />
    </div>
  )
}
