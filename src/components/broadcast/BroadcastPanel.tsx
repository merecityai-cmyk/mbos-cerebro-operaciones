'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Search, Send, Save, Trash2, ChevronDown, ChevronRight, X, Clock, CheckCircle2, AlertCircle, Circle, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Group {
  id: string
  name: string
  ghlContactId: string | null
}

interface Template {
  id: string
  name: string
  body: string
}

interface CampaignCounts {
  total: number
  sent: number
  failed: number
  pending: number
}

interface CampaignRow {
  id: string
  message: string
  status: 'scheduled' | 'sending' | 'completed' | 'cancelled'
  scheduledAt: string
  createdAt: string
  counts?: CampaignCounts
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const inputClass =
  'w-full h-9 text-sm border border-[#E2E8F0] rounded-md px-3 bg-white text-[#0F172A] focus:outline-none focus:border-[#1E40AF]'

const STATUS_META: Record<CampaignRow['status'], { label: string; cls: string }> = {
  scheduled: { label: 'Agendada', cls: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]' },
  sending: { label: 'Enviando', cls: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]' },
  completed: { label: 'Completada', cls: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]' },
  cancelled: { label: 'Cancelada', cls: 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]' },
}

function fmt(dt: string | null | undefined) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

export function BroadcastPanel({ groups }: { groups: Group[] }) {
  const { data: templates, mutate: mutateTemplates } = useSWR<Template[]>('/api/templates', fetcher)
  const { data: campaigns, mutate: mutateCampaigns } = useSWR<CampaignRow[]>('/api/broadcasts', fetcher, {
    refreshInterval: 15000,
  })

  const [message, setMessage] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const selectable = useMemo(() => groups.filter((g) => g.ghlContactId), [groups])
  const filtered = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  )

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      filtered.forEach((g) => g.ghlContactId && next.add(g.id))
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function saveAsTemplate() {
    const name = window.prompt('Nombre de la plantilla:')?.trim()
    if (!name || !message.trim()) return
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, body: message.trim() }),
    })
    mutateTemplates()
  }

  async function deleteTemplate(id: string) {
    if (!window.confirm('¿Eliminar esta plantilla?')) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    mutateTemplates()
  }

  const selectedCount = selectedIds.size
  const estMinutes = Math.max(0, selectedCount - 1) // 1 por minuto, el primero sale ya

  function validate(): string | null {
    if (!message.trim()) return 'Escribe un mensaje o elige una plantilla.'
    if (selectedCount === 0) return 'Selecciona al menos un grupo.'
    if (scheduleMode === 'later') {
      if (!scheduledAt) return 'Elige fecha y hora para agendar.'
      if (new Date(scheduledAt).getTime() <= Date.now()) return 'La fecha agendada debe ser futura.'
    }
    return null
  }

  async function send() {
    const v = validate()
    if (v) { setError(v); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          clientIds: Array.from(selectedIds),
          scheduledAt: scheduleMode === 'later' ? new Date(scheduledAt).toISOString() : null,
        }),
      })
      if (!res.ok) {
        setError('Error al crear la campaña.')
        return
      }
      setOkMsg(
        scheduleMode === 'later'
          ? `Campaña agendada para ${fmt(new Date(scheduledAt).toISOString())} · ${selectedCount} grupos.`
          : `Campaña iniciada · ${selectedCount} grupos, 1 por minuto.`
      )
      setMessage('')
      clearSelection()
      setConfirming(false)
      setScheduleMode('now')
      setScheduledAt('')
      mutateCampaigns()
      setTimeout(() => setOkMsg(''), 6000)
    } finally {
      setSending(false)
    }
  }

  async function cancelCampaign(id: string) {
    if (!window.confirm('¿Cancelar esta campaña? Los grupos pendientes no se enviarán.')) return
    await fetch(`/api/broadcasts/${id}/cancel`, { method: 'POST' })
    mutateCampaigns()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ─── Composición ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#0F172A]">1. Mensaje</h3>

          {/* Plantillas */}
          {templates && templates.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[#64748B] block mb-1.5">Usar plantilla</label>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-full pl-2.5 pr-1 py-0.5">
                    <button
                      onClick={() => setMessage(t.body)}
                      className="text-xs text-[#1E40AF] hover:underline"
                      title={t.body}
                    >
                      {t.name}
                    </button>
                    <button onClick={() => deleteTemplate(t.id)} className="text-[#94A3B8] hover:text-[#DC2626] p-0.5" title="Eliminar plantilla">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[#64748B] block mb-1.5">Texto del SMS</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={1600}
              placeholder="Escribe el mensaje que se enviará a todos los grupos seleccionados..."
              className="w-full text-sm border border-[#E2E8F0] rounded-md px-3 py-2 bg-white text-[#0F172A] focus:outline-none focus:border-[#1E40AF] resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <button
                onClick={saveAsTemplate}
                disabled={!message.trim()}
                className="flex items-center gap-1 text-xs text-[#1E40AF] hover:underline disabled:opacity-30 disabled:no-underline"
              >
                <Save className="h-3 w-3" /> Guardar como plantilla
              </button>
              <span className="text-[11px] text-[#94A3B8]">{message.length}/1600 · ~{Math.ceil((message.length || 1) / 160)} SMS</span>
            </div>
          </div>
        </div>

        {/* Programación */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#0F172A]">2. Cuándo enviar</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setScheduleMode('now')}
              className={cn('flex-1 h-9 text-xs font-medium rounded-md border transition-colors',
                scheduleMode === 'now' ? 'bg-[#1E40AF] text-white border-[#1E40AF]' : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]')}
            >
              Enviar ahora
            </button>
            <button
              onClick={() => setScheduleMode('later')}
              className={cn('flex-1 h-9 text-xs font-medium rounded-md border transition-colors',
                scheduleMode === 'later' ? 'bg-[#1E40AF] text-white border-[#1E40AF]' : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]')}
            >
              Agendar
            </button>
          </div>
          {scheduleMode === 'later' && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={inputClass}
            />
          )}
        </div>
      </div>

      {/* ─── Selección de grupos ─────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3 flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0F172A]">3. Grupos ({selectedCount} seleccionados)</h3>
          <div className="flex gap-2 text-xs">
            <button onClick={selectAllVisible} className="text-[#1E40AF] hover:underline">Seleccionar todos</button>
            <span className="text-[#CBD5E1]">·</span>
            <button onClick={clearSelection} className="text-[#64748B] hover:underline">Limpiar</button>
          </div>
        </div>

        <div className="relative">
          <Search className="h-3.5 w-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar grupo..."
            className={cn(inputClass, 'pl-8')}
          />
        </div>

        <div className="border border-[#E2E8F0] rounded-md divide-y divide-[#F1F5F9] max-h-[320px] overflow-y-auto">
          {filtered.length === 0 && <p className="text-xs text-[#94A3B8] p-3 text-center">Sin grupos.</p>}
          {filtered.map((g) => {
            const disabled = !g.ghlContactId
            const checked = selectedIds.has(g.id)
            return (
              <label
                key={g.id}
                className={cn('flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-[#F8FAFC]',
                  disabled && 'opacity-50 cursor-not-allowed')}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(g.id)}
                  className="accent-[#1E40AF]"
                />
                <span className="flex-1 text-[#0F172A]">{g.name}</span>
                {disabled && <span className="text-[10px] text-[#DC2626]">sin contacto GHL</span>}
              </label>
            )
          })}
        </div>
        <p className="text-[11px] text-[#94A3B8]">{selectable.length} de {groups.length} grupos tienen contacto de GHL válido.</p>

        {/* Resumen + acción */}
        <div className="mt-auto pt-2 border-t border-[#E2E8F0] space-y-2">
          {error && <p className="text-xs text-[#DC2626] bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}
          {okMsg && <p className="text-xs text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] rounded-md px-3 py-2">{okMsg}</p>}

          {!confirming ? (
            <button
              onClick={() => { const v = validate(); if (v) { setError(v); return } setError(''); setConfirming(true) }}
              className="flex items-center justify-center gap-1.5 w-full h-10 text-sm font-medium bg-[#1E40AF] text-white rounded-md hover:bg-[#1E3A8A] transition-colors"
            >
              <Send className="h-4 w-4" /> Revisar y enviar
            </button>
          ) : (
            <div className="space-y-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-3">
              <p className="text-xs text-[#0F172A]">
                Vas a enviar a <b>{selectedCount} grupos</b> por SMS
                {scheduleMode === 'later' ? <> el <b>{fmt(new Date(scheduledAt || Date.now()).toISOString())}</b></> : <>, <b>ahora</b></>}.
                {selectedCount > 1 && <> Tardará ~<b>{estMinutes} min</b> (1 grupo por minuto).</>}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={send}
                  disabled={sending}
                  className="flex items-center justify-center gap-1.5 flex-1 h-9 text-sm font-medium bg-[#1E40AF] text-white rounded-md hover:bg-[#1E3A8A] disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> {sending ? 'Creando...' : 'Confirmar envío'}
                </button>
                <button onClick={() => setConfirming(false)} className="h-9 px-3 text-sm text-[#64748B] border border-[#E2E8F0] rounded-md hover:bg-white">
                  Volver
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Historial de campañas ───────────────────────────────────── */}
      <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-lg p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Campañas</h3>
        {!campaigns || campaigns.length === 0 ? (
          <p className="text-xs text-[#94A3B8] py-4 text-center">Aún no hay campañas.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => {
              const meta = STATUS_META[c.status]
              const counts = c.counts ?? { total: 0, sent: 0, failed: 0, pending: 0 }
              const pct = counts.total > 0 ? Math.round(((counts.sent + counts.failed) / counts.total) * 100) : 0
              const isOpen = expanded === c.id
              return (
                <div key={c.id} className="border border-[#E2E8F0] rounded-md">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <button onClick={() => setExpanded(isOpen ? null : c.id)} className="text-[#94A3B8] hover:text-[#0F172A]">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#0F172A] truncate">{c.message}</p>
                      <p className="text-[11px] text-[#94A3B8]">
                        {c.status === 'scheduled' ? `Agendada: ${fmt(c.scheduledAt)}` : `Creada: ${fmt(c.createdAt)}`}
                        {' · '}{counts.sent} enviados · {counts.failed > 0 && <span className="text-[#DC2626]">{counts.failed} fallidos · </span>}{counts.pending} pendientes de {counts.total}
                      </p>
                    </div>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 border rounded-full', meta.cls)}>{meta.label}</span>
                    {(c.status === 'scheduled' || c.status === 'sending') && (
                      <button onClick={() => cancelCampaign(c.id)} className="text-[#94A3B8] hover:text-[#DC2626] p-1" title="Cancelar campaña">
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {/* barra de progreso */}
                  <div className="h-1 bg-[#F1F5F9] mx-3 mb-2 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1E40AF] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  {isOpen && <CampaignDetail id={c.id} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Detalle (lista de grupos con su estado) ────────────────────────────
interface RecipientRow {
  id: string
  clientName: string
  status: 'pending' | 'sent' | 'failed'
  sentAt: string | null
  error: string | null
}

function CampaignDetail({ id }: { id: string }) {
  const { data } = useSWR<{ recipients: RecipientRow[] }>(`/api/broadcasts/${id}`, fetcher, { refreshInterval: 15000 })
  if (!data) return <p className="text-xs text-[#94A3B8] px-3 pb-3">Cargando…</p>

  const icon = (s: RecipientRow['status']) =>
    s === 'sent' ? <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
      : s === 'failed' ? <AlertCircle className="h-3.5 w-3.5 text-[#DC2626]" />
      : <Circle className="h-3.5 w-3.5 text-[#CBD5E1]" />

  return (
    <div className="border-t border-[#F1F5F9] px-3 py-2 space-y-1 max-h-[240px] overflow-y-auto">
      {data.recipients.map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-xs">
          {icon(r.status)}
          <span className="flex-1 text-[#334155] truncate">{r.clientName}</span>
          {r.status === 'sent' && <span className="text-[#94A3B8]">{fmt(r.sentAt)}</span>}
          {r.status === 'failed' && <span className="text-[#DC2626] truncate max-w-[200px]" title={r.error ?? ''}>{r.error}</span>}
          {r.status === 'pending' && <span className="text-[#94A3B8]">en cola</span>}
        </div>
      ))}
    </div>
  )
}
