'use client'

import { useState, useRef } from 'react'
import { KPI_PHASES } from '@/lib/kpi/phases'
import type { KpiChecklistItem } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Clock, Save } from 'lucide-react'

// Un click: marca como completado. Segundo click: vuelve a pendiente.
// "En proceso" se mantiene como estado visible pero el click lo completa.
const STATUS_CYCLE: Record<string, 'pending' | 'in_progress' | 'completed'> = {
  pending: 'completed',
  in_progress: 'completed',
  completed: 'pending',
}

const STATUS_CONFIG = {
  pending: {
    icon: Circle,
    label: 'Pendiente',
    iconClass: 'text-[#94A3B8]',
    textClass: 'text-[#64748B]',
    bg: 'bg-white hover:bg-[#F8FAFC]',
  },
  in_progress: {
    icon: Clock,
    label: 'En proceso',
    iconClass: 'text-[#D97706]',
    textClass: 'text-[#0F172A]',
    bg: 'bg-[#FFFBEB] hover:bg-[#FEF3C7]',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completado',
    iconClass: 'text-[#059669]',
    textClass: 'text-[#64748B] line-through',
    bg: 'bg-[#F0FDF4] hover:bg-[#DCFCE7]',
  },
}

interface Props {
  recordId: string
  items: KpiChecklistItem[]
  observations: string | null
  phasesEnabled: string[]
  stats: { total: number; completed: number; inProgress: number; completionPct: number }
}

export function KpiChecklist({ recordId, items: initialItems, observations: initObs, phasesEnabled, stats: initStats }: Props) {
  const [observations, setObservations] = useState(initObs ?? '')
  const [savingObs, setSavingObs] = useState(false)
  const [obsMsg, setObsMsg] = useState<string | null>(null)
  const [, forceRender] = useState(0)
  const isPending = false

  // useRef sobrevive re-renders del servidor — guarda los estados locales
  // sin importar si Next.js re-hidrata el componente con datos del servidor
  const overrides = useRef<Record<string, 'pending' | 'in_progress' | 'completed'>>({})

  // Mezcla datos del servidor con overrides locales
  const items = initialItems.map(i =>
    overrides.current[i.id] !== undefined
      ? { ...i, status: overrides.current[i.id] }
      : i
  )

  const total = items.length
  const completed = items.filter((i) => i.status === 'completed').length
  const inProgress = items.filter((i) => i.status === 'in_progress').length
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0

  function toggleItem(item: KpiChecklistItem) {
    const currentStatus = overrides.current[item.id] ?? item.status
    const newStatus = STATUS_CYCLE[currentStatus]
    overrides.current[item.id] = newStatus
    forceRender(n => n + 1) // forzar re-render con el override

    fetch(`/api/kpi/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => {
      // Si falla red, revertir override
      overrides.current[item.id] = currentStatus
      forceRender(n => n + 1)
    })
  }

  async function saveObservations() {
    setSavingObs(true)
    setObsMsg(null)
    const url = window.location.pathname.replace('/kpi/', '/api/kpi/')
    // derive the API path from the current URL: /kpi/[clientId]/[year]/[month] → /api/kpi/[clientId]/[year]/[month]
    const parts = window.location.pathname.split('/')
    // parts: ['', 'kpi', clientId, year, month]
    const apiPath = `/api/kpi/${parts[2]}/${parts[3]}/${parts[4]}`
    try {
      await fetch(apiPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observations }),
      })
      setObsMsg('Guardado')
    } catch {
      setObsMsg('Error al guardar')
    } finally {
      setSavingObs(false)
      setTimeout(() => setObsMsg(null), 2000)
    }
  }

  const visiblePhases = KPI_PHASES.filter((p) => phasesEnabled.includes(p.key))

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <span className="text-2xl font-bold text-[#0F172A]">{completionPct}%</span>
            <span className="text-sm text-[#64748B] ml-2">completado</span>
          </div>
          <div className="flex gap-3 text-xs text-[#64748B] flex-wrap">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
              {completed} completadas
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-[#D97706]" />
              {inProgress} en proceso
            </span>
            <span className="flex items-center gap-1">
              <Circle className="h-3.5 w-3.5 text-[#94A3B8]" />
              {total - completed - inProgress} pendientes
            </span>
          </div>
        </div>
        <div className="h-3 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1E40AF] rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Phases */}
      {visiblePhases.map((phase) => {
        const phaseItems = items.filter((i) => i.phase === phase.key)
        const phaseCompleted = phaseItems.filter((i) => i.status === 'completed').length
        const phasePct = phaseItems.length > 0 ? Math.round((phaseCompleted / phaseItems.length) * 100) : 0

        return (
          <div key={phase.key} className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E2E8F0] flex items-center justify-between"
              style={{ borderLeftColor: phase.color, borderLeftWidth: 3 }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: phase.color }} />
                <h3 className="text-sm font-semibold text-[#0F172A]">{phase.label}</h3>
              </div>
              <span className="text-xs font-medium text-[#64748B]">
                {phaseCompleted}/{phaseItems.length} · {phasePct}%
              </span>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {phaseItems.map((item) => {
                const cfg = STATUS_CONFIG[item.status]
                const Icon = cfg.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={cn(
                      'w-full flex items-center gap-3 px-5 py-3 text-left transition-colors',
                      cfg.bg
                    )}
                  >
                    <Icon className={cn('h-4 w-4 flex-shrink-0', cfg.iconClass)} />
                    <span className={cn('text-sm flex-1', cfg.textClass)}>
                      {KPI_PHASES.flatMap((p) => p.items).find((i) => i.key === item.itemKey)?.label ?? item.itemKey}
                    </span>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', {
                      'bg-[#F1F5F9] text-[#64748B]': item.status === 'pending',
                      'bg-[#FEF3C7] text-[#92400E]': item.status === 'in_progress',
                      'bg-[#DCFCE7] text-[#166534]': item.status === 'completed',
                    })}>
                      {cfg.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Observations */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#0F172A]">Observaciones del mes</h3>
          <div className="flex items-center gap-2">
            {obsMsg && (
              <span className="text-xs text-[#059669]">{obsMsg}</span>
            )}
            <button
              onClick={saveObservations}
              disabled={savingObs}
              className="flex items-center gap-1.5 text-xs bg-[#1E40AF] text-white px-3 py-1.5 rounded-md hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              Guardar
            </button>
          </div>
        </div>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Notas sobre tareas pendientes al cierre del mes, solicitudes especiales, eventos no completados..."
          className="w-full h-32 text-sm border border-[#E2E8F0] rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent text-[#0F172A] placeholder:text-[#94A3B8]"
        />
        <p className="text-[11px] text-[#94A3B8] mt-1">
          Estas observaciones quedarán registradas como cierre del mes y podrán compararse con meses anteriores.
        </p>
      </div>
    </div>
  )
}
