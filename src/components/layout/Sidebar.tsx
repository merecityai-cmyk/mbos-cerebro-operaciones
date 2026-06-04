'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  FileText,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserMenu } from './UserMenu'
import type { SessionUser } from '@/types'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Tareas',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    label: 'Clientes',
    href: '/clients',
    icon: Users,
  },
  {
    label: 'Reportes',
    href: '/reports',
    icon: FileText,
  },
]

const MANAGER_ITEMS = [
  {
    label: 'Configuración',
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  user: SessionUser
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const navItems =
    user.role === 'manager' ? [...NAV_ITEMS, ...MANAGER_ITEMS] : NAV_ITEMS

  return (
    <aside className="w-[240px] flex-shrink-0 h-screen sticky top-0 bg-white border-r border-[#E2E8F0] flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[#E2E8F0]">
        <div className="w-8 h-8 rounded-lg bg-[#1E40AF] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">UD</span>
        </div>
        <div>
          <p className="font-bold text-[#0F172A] text-sm leading-tight">
            United Draft
          </p>
          <p className="text-[10px] text-[#64748B] leading-tight">
            Sistema interno
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
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
      <div className="px-2 pb-3 border-t border-[#E2E8F0] pt-3">
        <UserMenu user={user} />
      </div>
    </aside>
  )
}
