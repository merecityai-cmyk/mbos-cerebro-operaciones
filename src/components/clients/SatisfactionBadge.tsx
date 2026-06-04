import { cn } from '@/lib/utils'
import { SATISFACTION_COLORS, SATISFACTION_LABELS } from '@/lib/utils/formatting'
import type { SatisfactionLevel } from '@/types'

interface SatisfactionBadgeProps {
  level: SatisfactionLevel
  score?: number
  size?: 'sm' | 'md'
}

export function SatisfactionBadge({ level, score, size = 'sm' }: SatisfactionBadgeProps) {
  const { bg, text } = SATISFACTION_COLORS[level]
  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-medium rounded px-2 py-0.5 border',
      bg, text,
      level === 'high' ? 'border-[#16A34A]/20' : level === 'medium' ? 'border-[#D97706]/20' : 'border-[#DC2626]/20',
      size === 'sm' ? 'text-[11px]' : 'text-xs'
    )}>
      {SATISFACTION_LABELS[level]}
      {score !== undefined && <span className="opacity-70">· {score}/10</span>}
    </span>
  )
}
