'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { kpiChecklistItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

const STATUS_CYCLE: Record<string, 'pending' | 'in_progress' | 'completed'> = {
  pending: 'completed',
  in_progress: 'completed',
  completed: 'pending',
}

export async function toggleKpiItem(itemId: string, currentStatus: string, pathname: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const newStatus = STATUS_CYCLE[currentStatus] ?? 'completed'

  await db
    .update(kpiChecklistItems)
    .set({
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date() : null,
      completedById: newStatus === 'completed' ? (session.user.id as string) : null,
    })
    .where(eq(kpiChecklistItems.id, itemId))

  revalidatePath(pathname)
}
