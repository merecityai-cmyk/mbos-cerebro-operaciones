'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  tasks: 'Tareas',
  clients: 'Clientes',
  reports: 'Reportes',
  settings: 'Configuración',
  kpi: 'KPI Empresas',
}

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return [{ label: 'Dashboard', href: '/', current: true }]
  }

  const crumbs = [{ label: 'Dashboard', href: '/', current: false }]

  segments.forEach((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isCurrent = index === segments.length - 1

    const isId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
      /^\d{4}$/.test(segment) || // year
      /^\d{1,2}$/.test(segment)  // month

    const label = isId
      ? null // skip numeric/UUID segments in breadcrumb
      : (ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1))

    if (label) crumbs.push({ label, href, current: isCurrent })
  })

  return crumbs
}

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const breadcrumbs = buildBreadcrumbs(pathname)
  const currentPage = breadcrumbs[breadcrumbs.length - 1]

  return (
    <header className="h-14 border-b border-[#E2E8F0] bg-white flex items-center px-4 md:px-6 gap-3 flex-shrink-0">
      {/* Hamburger — only on mobile */}
      <button
        onClick={onMenuClick}
        className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-[#64748B] hover:bg-[#F1F5F9] transition-colors flex-shrink-0"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-1 min-w-0 shrink-0 last:shrink last:min-w-0">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-[#CBD5E1] flex-shrink-0" />
            )}
            {crumb.current ? (
              <span className="text-sm font-medium text-[#0F172A] truncate">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  'text-sm text-[#64748B] hover:text-[#0F172A] transition-colors truncate hidden sm:block',
                  index === 0 && breadcrumbs.length === 1 && 'text-[#0F172A] font-medium'
                )}
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Current page title — shown on md+ */}
      <h1 className="text-sm font-semibold text-[#0F172A] hidden md:block flex-shrink-0">
        {currentPage.label}
      </h1>
    </header>
  )
}
