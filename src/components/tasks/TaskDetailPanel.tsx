'use client'

import { useState, useEffect } from 'react'
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
  formatDate,
  getInitials,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/utils/formatting'
import { cn } from '@/lib/utils'
import { Calendar, Building2, Tag, Bot, PenLine, History, StickyNote } from 'lucide-react'
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
  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [auditLog, setAuditLog] = useState<Array<{
    id: string; field: string; oldValue: string | null; newValue: string; createdAt: string; userName: string
  }>>([])

  useEffect(() => {
    if (!task) return
    setNotes(task.notes ?? '')
    setNotesSaved(false)
    setAuditLog([])
    fetch(`/api/tasks/${task.id}/audit`)
      .then(r => r.json())
      .then(setAuditLog)
      .catch(() => {})
  }, [task?.id])

  if (!task) return null

  const colors = STATUS_COLORS[task.status]

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!task) return
    setSaving(true)
    try {
      await onStatusChange(task.id, e.target.value as TaskStatus)
    } finally {
      setSaving(false)
    }
  }

  async function handleAssigneeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!task) return
    setSaving(true)
    try {
      await onAssigneeChange(task.id, e.target.value)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNotes() {
    if (!task) return
    setNotesSaving(true)
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } finally {
      setNotesSaving(false)
    }
  }

  const selectClass = cn(
    'w-full h-9 text-sm border border-[#E2E8F0] rounded-md px-2 bg-white text-[#0F172A]',
    'focus:outline-none focus:border-[#1E40AF] cursor-pointer',
    saving && 'opacity-50 pointer-events-none'
  )

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
            <select value={task.status} onChange={handleStatusChange} className={selectClass}>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En progreso</option>
              <option value="completed">Completado</option>
              <option value="overdue">Vencido</option>
            </select>
          </div>

          {/* Reasignar */}
          <div>
            <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-2">
              Asignada a
            </p>
            <select value={task.assignedTo.id} onChange={handleAssigneeChange} className={selectClass}>
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>
                  {getInitials(a.name)} — {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <StickyNote className="h-3.5 w-3.5 text-[#64748B]" />
              <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                Notas y observaciones
              </p>
            </div>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesSaved(false) }}
              rows={4}
              placeholder="Agrega observaciones sobre esta tarea..."
              className="w-full text-sm border border-[#E2E8F0] rounded-md px-3 py-2 bg-white text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1E40AF] resize-none"
            />
            <div className="flex items-center justify-end gap-2 mt-1.5">
              {notesSaved && (
                <span className="text-xs text-green-600">Guardado</span>
              )}
              <Button
                size="sm"
                className="h-7 text-xs bg-[#1E40AF] text-white hover:bg-[#1E3A8A]"
                onClick={handleSaveNotes}
                disabled={notesSaving}
              >
                {notesSaving ? 'Guardando...' : 'Guardar nota'}
              </Button>
            </div>
          </div>
        </div>

        {/* Audit log */}
        <div className="pt-4 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-1.5 mb-3">
            <History className="h-3.5 w-3.5 text-[#64748B]" />
            <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Historial</p>
          </div>
          {auditLog.length === 0 ? (
            <p className="text-xs text-[#94A3B8] italic">Sin cambios registrados</p>
          ) : (
            <div className="space-y-2">
              {auditLog.map((log) => (
                <div key={log.id} className="flex gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1E40AF] mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="text-[#0F172A] font-medium">{log.userName}</span>
                    {log.field === 'status' ? (
                      <span className="text-[#64748B]"> cambió estado: <span className="font-medium">{log.oldValue ?? '—'}</span> → <span className="font-medium text-[#1E40AF]">{log.newValue}</span></span>
                    ) : (
                      <span className="text-[#64748B]"> reasignó: <span className="font-medium">{log.oldValue ?? '—'}</span> → <span className="font-medium text-[#1E40AF]">{log.newValue}</span></span>
                    )}
                    <p className="text-[#94A3B8] mt-0.5">{new Date(log.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[#E2E8F0] mt-4">
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
