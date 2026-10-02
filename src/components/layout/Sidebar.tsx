'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  FileText,
  Settings,
  BarChart3,
  MessageSquare,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserMenu } from './UserMenu'
import type { SessionUser } from '@/types'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Tareas', href: '/tasks', icon: CheckSquare },
  { label: 'Clientes', href: '/clients', icon: Users },
  { label: 'Reportes', href: '/reports', icon: FileText },
  { label: 'KPI Empresas', href: '/kpi', icon: BarChart3 },
  { label: 'Mensajes', href: '/mensajes', icon: MessageSquare },
]

const MANAGER_ITEMS = [
  { label: 'Configuración', href: '/settings', icon: Settings },
]

interface SidebarProps {
  user: SessionUser
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ user, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const navItems =
    user.role === 'manager' ? [...NAV_ITEMS, ...MANAGER_ITEMS] : NAV_ITEMS

  const sidebarContent = (
    <aside className="w-full h-full bg-white flex flex-col">
      {/* Logo + close button on mobile */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[#E2E8F0] flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#1E40AF] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">NX</span>
        </div>
        <div className="flex-1">
          <p className="font-bold text-[#0F172A] text-sm leading-tight">Nex - Merecity Brain OS</p>
          <p className="text-[10px] text-[#64748B] leading-tight">Sistema interno</p>
        </div>
        {/* Close button — only on mobile */}
        <button
          onClick={onMobileClose}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors',
                active
                  ? 'bg-[#DBEAFE] text-[#1E40AF] font-medium'
                  : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  active ? 'text-[#1E40AF]' : 'text-[#94A3B8]'
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User menu */}
      <div className="px-2 pb-3 border-t border-[#E2E8F0] pt-3 flex-shrink-0">
        <UserMenu user={user} />
      </div>
    </aside>
  )

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <div className="hidden md:flex md:w-[240px] md:flex-shrink-0 md:h-screen md:sticky md:top-0 border-r border-[#E2E8F0]">
        {sidebarContent}
      </div>

      {/* ── Mobile overlay ──────────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 left-0 z-50 w-[280px] h-full md:hidden transition-transform duration-300 ease-in-out shadow-xl',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </div>
    </>
  )
}
