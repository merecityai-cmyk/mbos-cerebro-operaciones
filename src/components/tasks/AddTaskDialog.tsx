'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TaskWithRelations } from '@/types'

interface AddTaskDialogProps {
  open: boolean
  onClose: () => void
  advisors: Array<{ id: string; name: string }>
  clients: Array<{ id: string; name: string }>
  onCreated: (task: TaskWithRelations) => void
}

const inputClass =
  'w-full h-9 text-sm border border-[#E2E8F0] rounded-md px-3 bg-white text-[#0F172A] focus:outline-none focus:border-[#1E40AF]'

export function AddTaskDialog({ open, onClose, advisors, clients, onCreated }: AddTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedToId, setAssignedToId] = useState(advisors[0]?.id ?? '')
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setTitle('')
    setDescription('')
    setAssignedToId(advisors[0]?.id ?? '')
    setClientId(clients[0]?.id ?? '')
    setDueDate('')
    setError('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('El título es obligatorio'); return }
    if (!clientId) { setError('Selecciona una empresa'); return }
    if (!assignedToId) { setError('Selecciona un responsable'); return }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          clientId,
          assignedToId,
          dueDate: dueDate || undefined,
        }),
      })
      if (!res.ok) { setError('Error al crear la tarea'); return }

      // Fetch the full task with relations
      const created = await res.json()
      const client = clients.find(c => c.id === clientId)
      const advisor = advisors.find(a => a.id === assignedToId)

      const taskWithRelations: TaskWithRelations = {
        ...created,
        notes: null,
        client: { id: clientId, name: client?.name ?? '', ghlContactId: null },
        assignedTo: { id: assignedToId, name: advisor?.name ?? '', email: '' },
      }

      onCreated(taskWithRelations)
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Panel — bottom sheet on mobile, centered modal on sm+ */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-sm font-semibold text-[#0F172A]">Nueva tarea manual</h2>
          <button onClick={handleClose} className="p-1 text-[#64748B] hover:text-[#0F172A] rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
          )}

          <div>
            <label className="text-xs font-medium text-[#64748B] block mb-1.5">Tarea *</label>
            <input
              className={inputClass}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Declarar IVA 2do bimestre 2026"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#64748B] block mb-1.5">Descripción</label>
            <textarea
              className="w-full text-sm border border-[#E2E8F0] rounded-md px-3 py-2 bg-white text-[#0F172A] focus:outline-none focus:border-[#1E40AF] resize-none"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalles adicionales (opcional)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#64748B] block mb-1.5">Empresa *</label>
              <select
                className={inputClass}
                value={clientId}
                onChange={e => setClientId(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#64748B] block mb-1.5">Responsable *</label>
              <select
                className={inputClass}
                value={assignedToId}
                onChange={e => setAssignedToId(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {advisors.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#64748B] block mb-1.5">Fecha de entrega</label>
            <input
              type="date"
              className={inputClass}
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs bg-[#1E40AF] text-white hover:bg-[#1E3A8A] flex-1"
              disabled={saving}
            >
              {saving ? 'Creando...' : 'Crear tarea'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={handleClose}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
