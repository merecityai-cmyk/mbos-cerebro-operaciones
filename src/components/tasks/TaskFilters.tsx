'use client'

import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export type DatePeriod = 'all' | 'today' | 'this_week' | 'last_week' | 'this_month' | 'custom'

const PERIODS: { value: DatePeriod; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'today', label: 'Hoy' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'last_week', label: 'Sem. pasada' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'custom', label: 'Rango' },
]

interface TaskFiltersProps {
  advisors: Array<{ id: string; name: string }>
  clients: Array<{ id: string; name: string }>
  selectedAdvisorId: string | null
  selectedClientId: string | null
  selectedPeriod: DatePeriod
  customDateFrom: string
  customDateTo: string
  searchQuery: string
  onAdvisorChange: (id: string | null) => void
  onClientChange: (id: string | null) => void
  onPeriodChange: (period: DatePeriod) => void
  onCustomDateFromChange: (date: string) => void
  onCustomDateToChange: (date: string) => void
  onSearchChange: (q: string) => void
}

export function TaskFilters({
  advisors,
  clients,
  selectedAdvisorId,
  selectedClientId,
  selectedPeriod,
  customDateFrom,
  customDateTo,
  searchQuery,
  onAdvisorChange,
  onClientChange,
  onPeriodChange,
  onCustomDateFromChange,
  onCustomDateToChange,
  onSearchChange,
}: TaskFiltersProps) {
  return (
    <div className="space-y-2.5">
      {/* Fila 1: Búsqueda (full width on mobile) */}
      <div className="relative w-full">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
        <Input
          placeholder="Buscar tarea o cliente..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-9 text-sm w-full"
        />
      </div>

      {/* Fila 2: Asesoras */}
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
          Todos
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

      {/* Fila 3: Períodos + empresa (scrollable on mobile) */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border whitespace-nowrap',
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
          className="h-8 text-xs border border-[#E2E8F0] rounded-md px-2 bg-white text-[#64748B] focus:outline-none focus:border-[#1E40AF] cursor-pointer max-w-[160px] md:max-w-[220px]"
        >
          <option value="">Todas las empresas</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Fila 4: Rango personalizado */}
      {selectedPeriod === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#64748B] font-medium">Desde</span>
          <input
            type="date"
            value={customDateFrom}
            onChange={(e) => onCustomDateFromChange(e.target.value)}
            className="h-8 text-xs border border-[#E2E8F0] rounded-md px-2 bg-white text-[#0F172A] focus:outline-none focus:border-[#1E40AF]"
          />
          <span className="text-xs text-[#64748B] font-medium">Hasta</span>
          <input
            type="date"
            value={customDateTo}
            onChange={(e) => onCustomDateToChange(e.target.value)}
            className="h-8 text-xs border border-[#E2E8F0] rounded-md px-2 bg-white text-[#0F172A] focus:outline-none focus:border-[#1E40AF]"
          />
          {(customDateFrom || customDateTo) && (
            <button
              onClick={() => { onCustomDateFromChange(''); onCustomDateToChange('') }}
              className="h-8 px-2 text-xs text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] rounded-md bg-white"
            >
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
