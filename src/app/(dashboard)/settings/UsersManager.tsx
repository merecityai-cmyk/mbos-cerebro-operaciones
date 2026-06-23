'use client'

import { useState } from 'react'
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  name: string
  email: string
  role: 'advisor' | 'manager'
}

interface UsersManagerProps {
  initialUsers: User[]
  currentUserId: string
}

type FormState = { name: string; email: string; password: string; role: 'advisor' | 'manager' }
const emptyForm: FormState = { name: '', email: '', password: '', role: 'advisor' }

export function UsersManager({ initialUsers, currentUserId }: UsersManagerProps) {
  const [users, setUsers] = useState(initialUsers)
  const [editId, setEditId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState<Partial<User & { password: string }>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    if (!form.name || !form.email || !form.password) { setError('Completa todos los campos'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { setError('Error al crear usuario'); return }
      const user = await res.json()
      setUsers(prev => [...prev, user].sort((a, b) => a.name.localeCompare(b.name)))
      setForm(emptyForm)
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(id: string) {
    if (!editForm.name && !editForm.email && !editForm.password && !editForm.role) {
      setEditId(null); return
    }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) { setError('Error al actualizar'); return }
      const updated = await res.json()
      setUsers(prev => prev.map(u => u.id === id ? updated : u))
      setEditId(null)
      setEditForm({})
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (!res.ok) { setError('Error al eliminar'); return }
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  function startEdit(user: User) {
    setEditId(user.id)
    setEditForm({ name: user.name, email: user.email, role: user.role, password: '' })
    setShowAdd(false)
    setError('')
  }

  const inputClass = "h-8 w-full text-xs border border-[#E2E8F0] rounded-md px-2 bg-white text-[#0F172A] focus:outline-none focus:border-[#1E40AF]"

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A]">Usuarios del sistema</h3>
          <p className="text-xs text-[#64748B] mt-0.5">Agrega, edita o elimina usuarios</p>
        </div>
        <Button
          size="sm"
          className="h-8 text-xs bg-[#1E40AF] text-white hover:bg-[#1E3A8A] gap-1"
          onClick={() => { setShowAdd(true); setEditId(null); setError('') }}
        >
          <Plus className="h-3.5 w-3.5" /> Agregar usuario
        </Button>
      </div>

      {error && (
        <div className="px-5 py-2 bg-red-50 text-xs text-red-600 border-b border-red-100">{error}</div>
      )}

      {/* Formulario de nuevo usuario */}
      {showAdd && (
        <div className="px-5 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <p className="text-xs font-semibold text-[#0F172A] mb-3">Nuevo usuario</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[11px] text-[#64748B] mb-1 block">Nombre</label>
              <input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo" />
            </div>
            <div>
              <label className="text-[11px] text-[#64748B] mb-1 block">Correo</label>
              <input className={inputClass} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@udtgroup.co" />
            </div>
            <div>
              <label className="text-[11px] text-[#64748B] mb-1 block">Contraseña</label>
              <input className={inputClass} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="text-[11px] text-[#64748B] mb-1 block">Rol</label>
              <select className={inputClass} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'advisor' | 'manager' }))}>
                <option value="advisor">Asesora</option>
                <option value="manager">Gerente</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs bg-[#1E40AF] text-white hover:bg-[#1E3A8A]" onClick={handleAdd} disabled={saving}>
              {saving ? 'Guardando...' : 'Crear usuario'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowAdd(false); setError('') }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <tr>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] uppercase">Nombre</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] uppercase">Correo</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] uppercase">Rol</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9]">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-[#F8FAFC]">
              {editId === u.id ? (
                <>
                  <td className="px-5 py-2">
                    <input className={inputClass} value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </td>
                  <td className="px-5 py-2">
                    <input className={inputClass} type="email" value={editForm.email ?? ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  </td>
                  <td className="px-5 py-2">
                    <select className={inputClass} value={editForm.role ?? u.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as 'advisor' | 'manager' }))}>
                      <option value="advisor">Asesora</option>
                      <option value="manager">Gerente</option>
                    </select>
                  </td>
                  <td className="px-5 py-2">
                    <div className="flex flex-col gap-1">
                      <input className={inputClass} type="password" placeholder="Nueva contraseña (opcional)" value={editForm.password ?? ''} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(u.id)} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="h-4 w-4" /></button>
                        <button onClick={() => { setEditId(null); setEditForm({}) }} className="p-1 text-[#64748B] hover:bg-[#F1F5F9] rounded"><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-5 py-3 font-medium text-[#0F172A]">{u.name}</td>
                  <td className="px-5 py-3 text-[#64748B] text-xs">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${u.role === 'manager' ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                      {u.role === 'manager' ? 'Gerente' : 'Asesora'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => startEdit(u)} className="p-1.5 text-[#64748B] hover:text-[#1E40AF] hover:bg-[#DBEAFE] rounded transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {u.id !== currentUserId && (
                        <button onClick={() => handleDelete(u.id, u.name)} className="p-1.5 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
