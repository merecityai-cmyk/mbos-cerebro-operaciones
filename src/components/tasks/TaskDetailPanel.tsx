'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, getInitials, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/formatting'
import { cn } from '@/lib/utils'
import { Calendar, Building2, Tag, Bot, PenLine, History, StickyNote, MessageSquare, Link2, Send, ExternalLink } from 'lucide-react'
import type { TaskWithRelations, TaskStatus } from '@/types'

interface TaskDetailPanelProps {
  task: TaskWithRelations | null
  advisors: Array<{ id: string; name: string }>
  clients: Array<{ id: string; name: string }>
  open: boolean
  onClose: () => void
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>
  onAssigneeChange: (taskId: string, userId: string) => Promise<void>
}

type Tab = 'detail' | 'comments' | 'history'

interface Comment {
  id: string
  content: string
  driveLink: string | null
  createdAt: string
  userName: string
  userId: string
}

interface AuditEntry {
  id: string; field: string; oldValue: string | null; newValue: string; createdAt: string; userName: string
}

const selectClass = 'w-full h-9 text-sm border border-[#334155] rounded-md px-2 bg-[#1E293B] text-[#F1F5F9] focus:outline-none focus:border-[#60A5FA] cursor-pointer'
const inputClass = 'w-full text-sm border border-[#334155] rounded-md px-3 py-2 bg-[#1E293B] text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#60A5FA]'

export function TaskDetailPanel({ task, advisors, clients, open, onClose, onStatusChange, onAssigneeChange }: TaskDetailPanelProps) {
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('detail')

  // Editable fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [fieldSaved, setFieldSaved] = useState<string | null>(null)

  // Comments
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [driveLink, setDriveLink] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  // Audit
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? '')
    setDueDate(task.dueDate ?? '')
    setNotes(task.notes ?? '')
    setComments([])
    setAuditLog([])
    setActiveTab('detail')

    fetch(`/api/tasks/${task.id}/comments`)
      .then(r => r.json()).then(setComments).catch(() => {})
    fetch(`/api/tasks/${task.id}/audit`)
      .then(r => r.json()).then(setAuditLog).catch(() => {})
  }, [task?.id])

  if (!task) return null

  const colors = STATUS_COLORS[task.status]

  async function saveField(field: string, value: string | null) {
    setSaving(true)
    try {
      await fetch(`/api/tasks/${task!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      setFieldSaved(field)
      setTimeout(() => setFieldSaved(null), 1500)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSaving(true)
    try { await onStatusChange(task!.id, e.target.value as TaskStatus) }
    finally { setSaving(false) }
  }

  async function handleAssigneeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSaving(true)
    try { await onAssigneeChange(task!.id, e.target.value) }
    finally { setSaving(false) }
  }

  async function postComment() {
    if (!commentText.trim()) return
    setPostingComment(true)
    try {
      const res = await fetch(`/api/tasks/${task!.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim(), driveLink: driveLink.trim() || undefined }),
      })
      if (res.ok) {
        const c: Comment = await res.json()
        setComments(prev => [...prev, c])
        setCommentText('')
        setDriveLink('')
      }
    } finally {
      setPostingComment(false)
    }
  }

  const TABS: { id: Tab; label: string; icon: typeof MessageSquare }[] = [
    { id: 'detail', label: 'Detalle', icon: StickyNote },
    { id: 'comments', label: `Comentarios${comments.length ? ` (${comments.length})` : ''}`, icon: MessageSquare },
    { id: 'history', label: 'Historial', icon: History },
  ]

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="w-full sm:max-w-md overflow-y-auto bg-[#0F172A] border-l border-[#1E293B] text-[#F1F5F9]"
      >
        {/* Header */}
        <SheetHeader className="pb-4 border-b border-[#1E293B]">
          <div className="flex items-start gap-2 mb-2">
            <Badge className={cn('text-[10px] font-semibold px-2 py-0.5 border rounded-sm', colors.bg, colors.text, colors.border)}>
              {STATUS_LABELS[task.status]}
            </Badge>
            <Badge className={cn('text-[10px] px-2 py-0.5 border rounded-sm', task.source === 'ai_generated' ? 'bg-[#0C4A6E]/40 text-[#38BDF8] border-[#0369A1]/30' : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]')}>
              {task.source === 'ai_generated' ? <span className="flex items-center gap-1"><Bot className="h-2.5 w-2.5" /> IA</span> : <span className="flex items-center gap-1"><PenLine className="h-2.5 w-2.5" /> Manual</span>}
            </Badge>
          </div>
          <SheetTitle className="text-sm font-semibold text-[#F8FAFC] leading-snug text-left">{task.title}</SheetTitle>
          <SheetDescription className="sr-only">Detalle de la tarea</SheetDescription>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex border-b border-[#1E293B] mt-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 text-xs py-2.5 font-medium transition-colors',
                activeTab === tab.id ? 'text-[#60A5FA] border-b-2 border-[#60A5FA]' : 'text-[#64748B] hover:text-[#94A3B8]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DETAIL TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'detail' && (
          <div className="py-4 space-y-4">
            {/* Cliente + fecha */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Building2 className="h-4 w-4 text-[#475569] flex-shrink-0 mt-5" />
                <div className="flex-1">
                  <p className="text-[10px] text-[#475569] mb-1">Cliente</p>
                  <select
                    defaultValue={task.client.id}
                    onChange={e => saveField('clientId', e.target.value)}
                    disabled={saving}
                    className={selectClass}
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Tag className="h-4 w-4 text-[#475569] flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-[#475569]">Creada</p>
                  <p className="text-sm font-medium text-[#F1F5F9]">{formatDate(task.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Título editable */}
            <div>
              <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Título</p>
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                rows={2}
                className={cn(inputClass, 'resize-none')}
              />
              <div className="flex justify-end mt-1">
                <button onClick={() => saveField('title', title)} disabled={saving || title === task.title} className="text-[10px] text-[#60A5FA] disabled:opacity-30 hover:underline">
                  {fieldSaved === 'title' ? '✓ Guardado' : 'Guardar título'}
                </button>
              </div>
            </div>

            {/* Descripción editable */}
            <div>
              <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Descripción</p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Detalles de la tarea..."
                className={cn(inputClass, 'resize-none')}
              />
              <div className="flex justify-end mt-1">
                <button onClick={() => saveField('description', description || null)} disabled={saving} className="text-[10px] text-[#60A5FA] disabled:opacity-30 hover:underline">
                  {fieldSaved === 'description' ? '✓ Guardado' : 'Guardar descripción'}
                </button>
              </div>
            </div>

            {/* Fecha de vencimiento */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#475569]" />
                <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Fecha límite</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className={cn(inputClass, 'flex-1')}
                />
                <button onClick={() => saveField('dueDate', dueDate || null)} disabled={saving} className="text-[10px] px-3 bg-[#1E3A8A] text-[#93C5FD] rounded-md hover:bg-[#1D4ED8] disabled:opacity-30 transition-colors whitespace-nowrap">
                  {fieldSaved === 'dueDate' ? '✓' : 'Guardar'}
                </button>
              </div>
            </div>

            {/* Estado */}
            <div>
              <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Estado</p>
              <select value={task.status} onChange={handleStatusChange} disabled={saving} className={selectClass}>
                <option value="pending">Pendiente</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completado</option>
                <option value="overdue">Vencido</option>
              </select>
            </div>

            {/* Asignada a */}
            <div>
              <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Asignada a</p>
              <select value={task.assignedTo.id} onChange={handleAssigneeChange} disabled={saving} className={selectClass}>
                {advisors.map(a => (
                  <option key={a.id} value={a.id}>{getInitials(a.name)} — {a.name}</option>
                ))}
              </select>
            </div>

            {/* Notas */}
            <div>
              <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Notas internas</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Observaciones privadas sobre esta tarea..."
                className={cn(inputClass, 'resize-none')}
              />
              <div className="flex justify-end mt-1">
                <button onClick={() => saveField('notes', notes || null)} disabled={saving} className="text-[10px] text-[#60A5FA] disabled:opacity-30 hover:underline">
                  {fieldSaved === 'notes' ? '✓ Guardado' : 'Guardar nota'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── COMMENTS TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'comments' && (
          <div className="py-4 space-y-4">
            {/* Existing comments */}
            <div className="space-y-3">
              {comments.length === 0 && (
                <p className="text-xs text-[#475569] italic text-center py-6">Sin comentarios aún. Sé el primero.</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="bg-[#1E293B] rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#1E3A8A] flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-[#93C5FD]">{getInitials(c.userName)}</span>
                      </div>
                      <span className="text-xs font-medium text-[#CBD5E1]">{c.userName}</span>
                    </div>
                    <span className="text-[10px] text-[#475569]">
                      {new Date(c.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm text-[#E2E8F0] leading-relaxed pl-8">{c.content}</p>
                  {c.driveLink && (
                    <a href={c.driveLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 pl-8 text-xs text-[#60A5FA] hover:underline">
                      <Link2 className="h-3 w-3" /> Ver en Drive
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* New comment form */}
            <div className="border-t border-[#1E293B] pt-4 space-y-2">
              <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Nuevo comentario</p>
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                rows={3}
                placeholder="Escribe tu comentario sobre esta gestión..."
                className={cn(inputClass, 'resize-none')}
              />
              <div className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-[#475569] flex-shrink-0" />
                <input
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                  placeholder="Link de Drive (opcional)"
                  className={cn(inputClass, 'flex-1 text-xs h-8')}
                />
              </div>
              <button
                onClick={postComment}
                disabled={!commentText.trim() || postingComment}
                className="flex items-center gap-1.5 w-full justify-center h-8 text-xs font-medium bg-[#1E3A8A] text-[#93C5FD] rounded-md hover:bg-[#1D4ED8] disabled:opacity-40 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                {postingComment ? 'Enviando...' : 'Publicar comentario'}
              </button>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="py-4">
            {auditLog.length === 0 ? (
              <p className="text-xs text-[#475569] italic text-center py-6">Sin cambios registrados</p>
            ) : (
              <div className="space-y-3">
                {auditLog.map(log => (
                  <div key={log.id} className="flex gap-2.5 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="text-[#CBD5E1] font-medium">{log.userName}</span>
                      {log.field === 'status' ? (
                        <span className="text-[#64748B]"> cambió estado: <span className="text-[#94A3B8]">{log.oldValue ?? '—'}</span> → <span className="text-[#60A5FA] font-medium">{log.newValue}</span></span>
                      ) : (
                        <span className="text-[#64748B]"> reasignó: <span className="text-[#94A3B8]">{log.oldValue ?? '—'}</span> → <span className="text-[#60A5FA] font-medium">{log.newValue}</span></span>
                      )}
                      <p className="text-[#475569] mt-0.5">
                        {new Date(log.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-[#1E293B] mt-2">
          <Button variant="outline" size="sm" className="w-full text-xs border-[#334155] text-[#94A3B8] hover:bg-[#1E293B] bg-transparent" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
