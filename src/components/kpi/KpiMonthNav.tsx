'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTH_NAMES } from '@/lib/kpi/phases'

interface Props {
  year: number
  month: number
}

export function KpiMonthNav({ year, month }: Props) {
  const router = useRouter()

  function go(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    router.push(`/kpi?year=${y}&month=${m}`)
  }

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-lg p-1">
      <button
        onClick={() => go(-1)}
        className="p-1.5 rounded-md hover:bg-[#F1F5F9] text-[#64748B] transition-colors"
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-[#0F172A] px-2 min-w-[130px] text-center">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button
        onClick={() => go(1)}
        disabled={isCurrentMonth}
        className="p-1.5 rounded-md hover:bg-[#F1F5F9] text-[#64748B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
