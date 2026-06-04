'use client'

import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface TaskFiltersProps {
  advisors: Array<{ id: string; name: string }>
  selectedAdvisorId: string | null
  searchQuery: string
  onAdvisorChange: (id: string | null) => void
  onSearchChange: (q: string) => void
}

export function TaskFilters({
  advisors,
  selectedAdvisorId,
  searchQuery,
  onAdvisorChange,
  onSearchChange,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Chips de asesoras */}
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
        {advisors.map((advisor) => (
          <button
            key={advisor.id}
            onClick={() => onAdvisorChange(advisor.id)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
              selectedAdvisorId === advisor.id
                ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#1E40AF]/40 hover:text-[#1E40AF]'
            )}
          >
            {advisor.name}
          </button>
        ))}
      </div>

      {/* Búsqueda por cliente */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
        <Input
          placeholder="Buscar cliente..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>
    </div>
  )
}
