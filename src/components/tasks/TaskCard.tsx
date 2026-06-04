'use client'

import { AlertCircle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateShort, getInitials, isOverdue } from '@/lib/utils/formatting'
import type { TaskWithRelations } from '@/types'

interface TaskCardProps {
  task: TaskWithRelations
  onClick: (task: TaskWithRelations) => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const overdue = task.status !== 'completed' && isOverdue(task.dueDate)

  return (
    <div
      onClick={() => onClick(task)}
      className="bg-white border border-[#E2E8F0] rounded-md p-3 cursor-pointer hover:border-[#1E40AF]/40 hover:shadow-sm transition-all group"
    >
      {/* Título */}
      <p className="text-[13px] font-medium text-[#0F172A] leading-snug mb-2.5 group-hover:text-[#1E40AF] transition-colors">
        {task.title}
      </p>

      {/* Cliente */}
      <p className="text-[11px] text-[#64748B] mb-2.5 truncate">
        {task.client.name}
      </p>

      {/* Footer: fecha + asignado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {task.dueDate && (
            <div
              className={cn(
                'flex items-center gap-1 text-[11px]',
                overdue ? 'text-[#DC2626]' : 'text-[#64748B]'
              )}
            >
              {overdue && <AlertCircle className="h-3 w-3" />}
              {!overdue && <Calendar className="h-3 w-3" />}
              <span>{formatDateShort(task.dueDate)}</span>
            </div>
          )}
        </div>

        {/* Avatar asignado */}
        <div
          className="w-6 h-6 rounded-full bg-[#DBEAFE] flex items-center justify-center flex-shrink-0"
          title={task.assignedTo.name}
        >
          <span className="text-[9px] font-semibold text-[#1E40AF]">
            {getInitials(task.assignedTo.name)}
          </span>
        </div>
      </div>
    </div>
  )
}
