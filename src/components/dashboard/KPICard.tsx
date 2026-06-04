import { cn } from '@/lib/utils'

interface KPICardProps {
  label: string
  value: string | number
  delta?: string
  deltaPositive?: boolean
  accent?: 'blue' | 'red' | 'green' | 'amber'
}

const ACCENT_STYLES = {
  blue:  { delta: 'bg-[#DBEAFE] text-[#1E40AF]' },
  red:   { delta: 'bg-[#FEE2E2] text-[#DC2626]' },
  green: { delta: 'bg-[#DCFCE7] text-[#16A34A]' },
  amber: { delta: 'bg-[#FEF3C7] text-[#D97706]' },
}

export function KPICard({ label, value, delta, accent = 'blue' }: KPICardProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
      <p className="text-xs font-medium text-[#64748B] mb-2">{label}</p>
      <p className="text-3xl font-semibold text-[#0F172A] mb-2">{value}</p>
      {delta && (
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded', ACCENT_STYLES[accent].delta)}>
          {delta}
        </span>
      )}
    </div>
  )
}
