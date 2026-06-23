'use client'

import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export type DatePeriod = 'all' | 'today' | 'this_week' | 'last_week' | 'this_month'

const PERIODS: { value: DatePeriod; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'today', label: 'Hoy' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'last_week', label: 'Semana pasada' },
  { value: 'this_month', label: 'Este mes' },
]

interface TaskFiltersProps {
  advisors: Array<{ id: string; name: string }>
  clients: Array<{ id: string; name: string }>
  selectedAdvisorId: string | null
  selectedClientId: string | null
  selectedPeriod: DatePeriod
  searchQuery: string
  onAdvisorChange: (id: string | null) => void
  onClientChange: (id: string | null) => void
  onPeriodChange: (period: DatePeriod) => void
  onSearchChange: (q: string) => void
}

export function TaskFilters({
  advisors,
  clients,
  selectedAdvisorId,
  selectedClientId,
  selectedPeriod,
  searchQuery,
  onAdvisorChange,
  onClientChange,
  onPeriodChange,
  onSearchChange,
}: TaskFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Fila 1: Asesoras + búsqueda */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onAdvisorChange(null)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
              selectedAdvisorId === null
                ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#1E40AF]/40 hover:text-[#1E40AF]'
            )}
          >
            Todas
          </button>
          {advisors.map((a) => (
            <button
              key={a.id}
              onClick={() => onAdvisorChange(a.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                selectedAdvisorId === a.id
                  ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                  : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#1E40AF]/40 hover:text-[#1E40AF]'
              )}
            >
              {a.name}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
          <Input
            placeholder="Buscar tarea..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Fila 2: Períodos + empresa */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                selectedPeriod === p.value
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#0F172A]/40 hover:text-[#0F172A]'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select
          value={selectedClientId ?? ''}
          onChange={(e) => onClientChange(e.target.value || null)}
          className="h-8 text-xs border border-[#E2E8F0] rounded-md px-2 bg-white text-[#64748B] focus:outline-none focus:border-[#1E40AF] cursor-pointer ml-auto max-w-[220px]"
        >
          <option value="">Todas las empresas</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
