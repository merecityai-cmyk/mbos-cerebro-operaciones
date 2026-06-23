'use client'

import { useState, useOptimistic, useCallback } from 'react'
import { TaskColumn } from './TaskColumn'
import { TaskFilters, type DatePeriod } from './TaskFilters'
import { TaskDetailPanel } from './TaskDetailPanel'
import type { TaskWithRelations, TaskStatus } from '@/types'

const COLUMNS: TaskStatus[] = ['pending', 'in_progress', 'completed', 'overdue']

function getPeriodRange(period: DatePeriod, customFrom: string, customTo: string): { start: Date; end: Date } | null {
  if (period === 'all') return null

  if (period === 'custom') {
    if (!customFrom && !customTo) return null
    const start = customFrom ? new Date(customFrom + 'T00:00:00') : new Date(0)
    const end = customTo ? new Date(customTo + 'T23:59:59') : new Date(9999, 11, 31)
    return { start, end }
  }

  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  if (period === 'today') {
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else if (period === 'this_week') {
    const day = now.getDay()
    start.setDate(now.getDate() - day)
    start.setHours(0, 0, 0, 0)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
  } else if (period === 'last_week') {
    const day = now.getDay()
    start.setDate(now.getDate() - day - 7)
    start.setHours(0, 0, 0, 0)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
  } else if (period === 'this_month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setMonth(now.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)
  }
  return { start, end }
}

interface TaskBoardProps {
  initialTasks: TaskWithRelations[]
  advisors: Array<{ id: string; name: string }>
  clients: Array<{ id: string; name: string }>
}

export function TaskBoard({ initialTasks, advisors, clients }: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [optimisticTasks, updateOptimistic] = useOptimistic(
    initialTasks,
    (state: TaskWithRelations[], update: Partial<TaskWithRelations> & { id: string }) => {
      return state.map((t) => t.id === update.id ? { ...t, ...update } : t)
    }
  )

  const filteredTasks = optimisticTasks.filter((t) => {
    const matchAdvisor = !selectedAdvisorId || t.assignedTo.id === selectedAdvisorId
    const matchClient = !selectedClientId || t.client.id === selectedClientId
    const matchSearch = !searchQuery ||
      t.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase())

    const range = getPeriodRange(selectedPeriod, customDateFrom, customDateTo)
    const matchPeriod = !range || (
      new Date(t.createdAt) >= range.start &&
      new Date(t.createdAt) <= range.end
    )

    return matchAdvisor && matchClient && matchSearch && matchPeriod
  })

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
      updateOptimistic({ id: taskId, status })
      setSelectedTask((prev) => (prev?.id === taskId ? { ...prev, status } : prev))
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
      <TaskFilters
        advisors={advisors}
        clients={clients}
        selectedAdvisorId={selectedAdvisorId}
        selectedClientId={selectedClientId}
        selectedPeriod={selectedPeriod}
        customDateFrom={customDateFrom}
        customDateTo={customDateTo}
        searchQuery={searchQuery}
        onAdvisorChange={setSelectedAdvisorId}
        onClientChange={setSelectedClientId}
        onPeriodChange={setSelectedPeriod}
        onCustomDateFromChange={setCustomDateFrom}
        onCustomDateToChange={setCustomDateTo}
        onSearchChange={setSearchQuery}
      />

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
