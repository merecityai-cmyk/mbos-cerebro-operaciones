import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { messageTemplates } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  body: z.string().min(1).max(1600).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [updated] = await db
    .update(messageTemplates)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(messageTemplates.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(messageTemplates).where(eq(messageTemplates.id, id))
  return NextResponse.json({ success: true })
}
