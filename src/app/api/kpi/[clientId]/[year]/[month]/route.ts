import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { clients, kpiMonthlyRecords, kpiChecklistItems } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getClientPhases } from '@/lib/kpi/phases'

type Params = { clientId: string; year: string; month: string }

// GET — fetch (or create) the monthly KPI record for a client
export async function GET(req: NextRequest, { params }: { params: Promise<Params> }) {
  await requireSession()
  const { clientId, year, month } = await params
  const y = parseInt(year), m = parseInt(month)

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1)

  if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  let [record] = await db
    .select()
    .from(kpiMonthlyRecords)
    .where(and(
      eq(kpiMonthlyRecords.clientId, clientId),
      eq(kpiMonthlyRecords.year, y),
      eq(kpiMonthlyRecords.month, m),
    ))
    .limit(1)

  // Auto-create if it doesn't exist
  if (!record) {
    const phases = getClientPhases({
      hasNomina: client.hasNomina,
      hasDocumentosSoporte: client.hasDocumentosSoporte,
    })

    ;[record] = await db
      .insert(kpiMonthlyRecords)
      .values({ clientId, year: y, month: m })
      .returning()

    const itemsToInsert = phases.flatMap((phase, pi) =>
      phase.items.map((item, ii) => ({
        recordId: record.id,
        phase: phase.key,
        itemKey: item.key,
        status: 'pending' as const,
        sortOrder: pi * 100 + ii,
      }))
    )

    if (itemsToInsert.length > 0) {
      await db.insert(kpiChecklistItems).values(itemsToInsert)
    }
  }

  const items = await db
    .select()
    .from(kpiChecklistItems)
    .where(eq(kpiChecklistItems.recordId, record.id))
    .orderBy(kpiChecklistItems.sortOrder)

  const total = items.length
  const completed = items.filter((i) => i.status === 'completed').length
  const inProgress = items.filter((i) => i.status === 'in_progress').length
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0

  return NextResponse.json({
    record,
    items,
    stats: { total, completed, inProgress, completionPct },
    client: {
      id: client.id,
      name: client.name,
      hasNomina: client.hasNomina,
      nominaCycle: client.nominaCycle,
      hasDocumentosSoporte: client.hasDocumentosSoporte,
    },
  })
}

// PATCH — update observations or close the record
export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  await requireSession()
  const { clientId, year, month } = await params
  const body = await req.json()

  const [record] = await db
    .select()
    .from(kpiMonthlyRecords)
    .where(and(
      eq(kpiMonthlyRecords.clientId, clientId),
      eq(kpiMonthlyRecords.year, parseInt(year)),
      eq(kpiMonthlyRecords.month, parseInt(month)),
    ))
    .limit(1)

  if (!record) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })

  const updates: Partial<typeof kpiMonthlyRecords.$inferInsert> = {
    updatedAt: new Date(),
  }
  if ('observations' in body) updates.observations = body.observations
  if ('closedAt' in body) updates.closedAt = body.closedAt ? new Date(body.closedAt) : null

  const [updated] = await db
    .update(kpiMonthlyRecords)
    .set(updates)
    .where(eq(kpiMonthlyRecords.id, record.id))
    .returning()

  return NextResponse.json(updated)
}
