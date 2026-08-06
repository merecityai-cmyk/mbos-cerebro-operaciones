import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { clients } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const patchSchema = z.object({
  assignedAdvisorId: z.string().uuid().optional(),
  hasNomina: z.boolean().optional(),
  nominaCycle: z.number().int().nullable().optional(),
  hasDocumentosSoporte: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updates: Partial<typeof clients.$inferInsert> = { updatedAt: new Date() }
  if (parsed.data.assignedAdvisorId) updates.assignedAdvisorId = parsed.data.assignedAdvisorId
  if (parsed.data.hasNomina !== undefined) updates.hasNomina = parsed.data.hasNomina
  if (parsed.data.nominaCycle !== undefined) updates.nominaCycle = parsed.data.nominaCycle
  if (parsed.data.hasDocumentosSoporte !== undefined) updates.hasDocumentosSoporte = parsed.data.hasDocumentosSoporte

  await db
    .update(clients)
    .set(updates)
    .where(eq(clients.id, id))

  return NextResponse.json({ success: true })
}
