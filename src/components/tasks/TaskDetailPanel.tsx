'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatDate,
  getInitials,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/utils/formatting'
import { cn } from '@/lib/utils'
import { Calendar, Building2, User2, Tag, Bot, PenLine } from 'lucide-react'
import type { TaskWithRelations, TaskStatus } from '@/types'

interface TaskDetailPanelProps {
  task: TaskWithRelations | null
  advisors: Array<{ id: string; name: string }>
  open: boolean
  onClose: () => void
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>
  onAssigneeChange: (taskId: string, userId: string) => Promise<void>
}

export function TaskDetailPanel({
  task,
  advisors,
  open,
  onClose,
  onStatusChange,
  onAssigneeChange,
}: TaskDetailPanelProps) {
  const [saving, setSaving] = useState(false)

  if (!task) return null

  const colors = STATUS_COLORS[task.status]

  async function handleStatusChange(val: string | null) {
    if (!task || !val) return
    setSaving(true)
    try {
      await onStatusChange(task.id, val as TaskStatus)
    } finally {
      setSaving(false)
    }
  }

  async function handleAssigneeChange(val: string | null) {
    if (!task || !val) return
    setSaving(true)
    try {
      await onAssigneeChange(task.id, val)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-start gap-2 mb-1">
            <Badge
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 border',
                colors.bg,
                colors.text,
                colors.border,
                'rounded-sm'
              )}
            >
              {STATUS_LABELS[task.status]}
            </Badge>
            <Badge
              className={cn(
                'text-[10px] px-2 py-0.5 border rounded-sm',
                task.source === 'ai_generated'
                  ? 'bg-[#F0F9FF] text-[#0369A1] border-[#0369A1]/20'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]'
              )}
            >
              {task.source === 'ai_generated' ? (
                <span className="flex items-center gap-1">
                  <Bot className="h-2.5 w-2.5" /> IA
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <PenLine className="h-2.5 w-2.5" /> Manual
                </span>
              )}
            </Badge>
          </div>
          <SheetTitle className="text-base font-semibold text-[#0F172A] leading-snug text-left">
            {task.title}
          </SheetTitle>
          <SheetDescription className="sr-only">Detalle de la tarea</SheetDescription>
        </SheetHeader>

        <div className="py-5 space-y-5">
          {/* Descripción */}
          {task.description && (
            <div>
              <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-1.5">
                Descripción
              </p>
              <p className="text-sm text-[#0F172A] leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-[#94A3B8] flex-shrink-0" />
              <div>
                <p className="text-[11px] text-[#94A3B8]">Cliente</p>
                <p className="text-sm font-medium text-[#0F172A]">{task.client.name}</p>
              </div>
            </div>

            {task.dueDate && (
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-[#94A3B8] flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-[#94A3B8]">Fecha límite</p>
                  <p className="text-sm font-medium text-[#0F172A]">
                    {formatDate(task.dueDate)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <Tag className="h-4 w-4 text-[#94A3B8] flex-shrink-0" />
              <div>
                <p className="text-[11px] text-[#94A3B8]">Creada</p>
                <p className="text-sm font-medium text-[#0F172A]">
                  {formatDate(task.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Cambiar estado */}
          <div>
            <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-2">
              Estado
            </p>
            <Select value={task.status} onValueChange={handleStatusChange} disabled={saving}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_progress">En progreso</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reasignar */}
          <div>
            <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-2">
              Asignada a
            </p>
            <Select
              value={task.assignedTo.id}
              onValueChange={handleAssigneeChange}
              disabled={saving}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {advisors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#DBEAFE] flex items-center justify-center">
                        <span className="text-[9px] font-semibold text-[#1E40AF]">
                          {getInitials(a.name)}
                        </span>
                      </div>
                      {a.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E2E8F0]">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
