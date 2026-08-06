import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { kpiChecklistItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

type Params = { itemId: string }

// PATCH — cycle item status: pending → in_progress → completed → pending
export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const session = await requireSession()
  const { itemId } = await params
  const body = await req.json()

  const [item] = await db
    .select()
    .from(kpiChecklistItems)
    .where(eq(kpiChecklistItems.id, itemId))
    .limit(1)

  if (!item) return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })

  const newStatus = body.status as 'pending' | 'in_progress' | 'completed'
  const validStatuses = ['pending', 'in_progress', 'completed']
  if (!validStatuses.includes(newStatus)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const [updated] = await db
    .update(kpiChecklistItems)
    .set({
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date() : null,
      completedById: newStatus === 'completed' ? session.user.id : null,
    })
    .where(eq(kpiChecklistItems.id, itemId))
    .returning()

  return NextResponse.json(updated)
}
