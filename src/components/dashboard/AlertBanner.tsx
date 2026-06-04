import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface AlertBannerProps {
  count: number
}

export function AlertBanner({ count }: AlertBannerProps) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-3 bg-[#FEE2E2] border border-[#DC2626]/20 rounded-lg px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-[#DC2626] flex-shrink-0" />
      <p className="text-sm text-[#DC2626] font-medium">
        {count} tarea{count !== 1 ? 's' : ''} vencida{count !== 1 ? 's' : ''} sin atender
      </p>
      <Link
        href="/tasks"
        className="ml-auto text-xs font-semibold text-[#DC2626] underline underline-offset-2 hover:no-underline"
      >
        Ver tablero →
      </Link>
    </div>
  )
}
