'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw } from 'lucide-react'
import { TaskColumn } from './TaskColumn'
import { TaskFilters, type DatePeriod } from './TaskFilters'
import { TaskDetailPanel } from './TaskDetailPanel'
import { AddTaskDialog } from './AddTaskDialog'
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
  const router = useRouter()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  // Auto-refresh every 30 seconds so other users' changes are visible without manual F5
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(interval)
  }, [router])
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [addTaskOpen, setAddTaskOpen] = useState(false)

  // useRef sobrevive el router.refresh() cada 30s sin perder cambios locales
  const localOverrides = useRef<Map<string, Partial<TaskWithRelations>>>(new Map())
  const [, forceRender] = useState(0)

  const applyOverrides = useCallback((tasks: TaskWithRelations[]) =>
    tasks.map(t => {
      const ov = localOverrides.current.get(t.id)
      return ov ? { ...t, ...ov } : t
    }),
    []
  )

  const handleTaskCreated = useCallback((task: TaskWithRelations) => {
    localOverrides.current.set(task.id, task)
    forceRender(n => n + 1)
  }, [])

  const filteredTasks = applyOverrides(initialTasks).filter((t) => {
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
      localOverrides.current.set(taskId, { ...localOverrides.current.get(taskId), status })
      forceRender(n => n + 1)
      setSelectedTask((prev) => (prev?.id === taskId ? { ...prev, status } : prev))
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    },
    []
  )

  const handleAssigneeChange = useCallback(
    async (taskId: string, userId: string) => {
      const newAdvisor = advisors.find((a) => a.id === userId)
      if (!newAdvisor) return

      localOverrides.current.set(taskId, {
        ...localOverrides.current.get(taskId),
        assignedTo: { id: userId, name: newAdvisor.name, email: '' },
      })
      forceRender(n => n + 1)
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
    [advisors]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
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
        </div>
        <button
          onClick={() => setAddTaskOpen(true)}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-[#1E40AF] text-white rounded-md hover:bg-[#1E3A8A] transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva tarea
        </button>
      </div>

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
        clients={clients}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onStatusChange={handleStatusChange}
        onAssigneeChange={handleAssigneeChange}
      />

      <AddTaskDialog
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        advisors={advisors}
        clients={clients}
        onCreated={handleTaskCreated}
      />
    </div>
  )
}
