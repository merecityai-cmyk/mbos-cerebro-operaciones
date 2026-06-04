'use client'

import { signOut } from 'next-auth/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User } from 'lucide-react'
import type { SessionUser } from '@/types'

interface UserMenuProps {
  user: SessionUser
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function UserMenu({ user }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg hover:bg-[#F1F5F9] transition-colors text-left bg-transparent border-0 cursor-pointer">
        <div className="w-8 h-8 rounded-full bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-[#1E40AF]">
            {getInitials(user.name)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#0F172A] truncate">
            {user.name}
          </p>
          <p className="text-xs text-[#64748B] truncate">
            {user.role === 'manager' ? 'Gerente' : 'Asesora'}
          </p>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="top" className="w-52 mb-1">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-[#0F172A]">
              {user.name}
            </span>
            <span className="text-xs text-[#64748B]">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-[#64748B]">
          <User className="mr-2 h-3.5 w-3.5" />
          Mi perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-[#DC2626] focus:text-[#DC2626] focus:bg-[#FEE2E2] text-xs cursor-pointer"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
