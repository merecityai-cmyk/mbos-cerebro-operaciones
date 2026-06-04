import { cn } from '@/lib/utils'
import { TaskCard } from './TaskCard'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/utils/formatting'
import type { TaskWithRelations, TaskStatus } from '@/types'

interface TaskColumnProps {
  status: TaskStatus
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
}

export function TaskColumn({ status, tasks, onTaskClick }: TaskColumnProps) {
  const colors = STATUS_COLORS[status]
  const label = STATUS_LABELS[status]

  return (
    <div className={cn('flex flex-col rounded-lg border p-3 min-h-[400px]', colors.bg, colors.border)}>
      {/* Header de columna */}
      <div className="flex items-center justify-between mb-3">
        <span className={cn('text-xs font-semibold', colors.text)}>{label}</span>
        <span
          className={cn(
            'text-[11px] font-semibold px-2 py-0.5 rounded-full',
            colors.text,
            colors.bg,
            'border',
            colors.border
          )}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-[#94A3B8] text-center py-6">Sin tareas</p>
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
      </div>
    </div>
  )
}
