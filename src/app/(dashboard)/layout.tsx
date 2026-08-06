import { requireSession } from '@/lib/auth/helpers'
import { DashboardShell } from '@/components/layout/DashboardShell'
import type { SessionUser } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()

  const user: SessionUser = {
    id: session.user.id,
    name: session.user.name ?? '',
    email: session.user.email ?? '',
    role: session.user.role,
  }

  return <DashboardShell user={user}>{children}</DashboardShell>
}
