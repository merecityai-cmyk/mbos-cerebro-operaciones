'use client'

import { useState, useCallback } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { SessionUser } from '@/types'

interface DashboardShellProps {
  user: SessionUser
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const openNav = useCallback(() => setMobileNavOpen(true), [])
  const closeNav = useCallback(() => setMobileNavOpen(false), [])

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar user={user} mobileOpen={mobileNavOpen} onMobileClose={closeNav} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={openNav} />
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
