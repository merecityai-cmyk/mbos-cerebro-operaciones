import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { broadcastCampaigns, broadcastRecipients, clients } from '@/lib/db/schema'
import { desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío').max(1600),
  clientIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos un grupo'),
  scheduledAt: z.string().datetime().nullable().optional(), // ISO; null/ausente = enviar ahora
})

// GET — lista de campañas con conteos de estado
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaigns = await db
    .select()
    .from(broadcastCampaigns)
    .orderBy(desc(broadcastCampaigns.createdAt))
    .limit(50)

  if (campaigns.length === 0) return NextResponse.json([])

  // Conteos por campaña
  const counts = await db
    .select({
      campaignId: broadcastRecipients.campaignId,
      status: broadcastRecipients.status,
      count: sql<number>`count(*)::int`,
    })
    .from(broadcastRecipients)
    .where(inArray(broadcastRecipients.campaignId, campaigns.map((c) => c.id)))
    .groupBy(broadcastRecipients.campaignId, broadcastRecipients.status)

  const byCampaign = new Map<string, { total: number; sent: number; failed: number; pending: number }>()
  for (const c of campaigns) byCampaign.set(c.id, { total: 0, sent: 0, failed: 0, pending: 0 })
  for (const row of counts) {
    const agg = byCampaign.get(row.campaignId)!
    agg.total += row.count
    if (row.status === 'sent') agg.sent += row.count
    else if (row.status === 'failed') agg.failed += row.count
    else if (row.status === 'pending') agg.pending += row.count
  }

  return NextResponse.json(campaigns.map((c) => ({ ...c, counts: byCampaign.get(c.id) })))
}

// POST — crear campaña + cola de destinatarios
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { message, clientIds, scheduledAt } = parsed.data

  // Resolver los clientes seleccionados (nombre + ghlContactId)
  const selected = await db
    .select({ id: clients.id, name: clients.name, ghlContactId: clients.ghlContactId })
    .from(clients)
    .where(inArray(clients.id, clientIds))

  if (selected.length === 0) {
    return NextResponse.json({ error: 'Ningún grupo válido' }, { status: 400 })
  }

  const startAt = scheduledAt ? new Date(scheduledAt) : new Date()

  const [campaign] = await db
    .insert(broadcastCampaigns)
    .values({
      message,
      channel: 'sms',
      status: 'scheduled',
      intervalMinutes: 1,
      scheduledAt: startAt,
      createdById: session.user.id as string,
    })
    .returning()

  // Crear un recipient por grupo, preservando el orden de selección
  const orderById = new Map(clientIds.map((id, i) => [id, i]))
  const recipientsToInsert = selected
    .sort((a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0))
    .map((c, i) => ({
      campaignId: campaign.id,
      clientId: c.id,
      ghlContactId: c.ghlContactId,
      orderIndex: i,
      status: 'pending' as const,
    }))

  await db.insert(broadcastRecipients).values(recipientsToInsert)

  return NextResponse.json({ id: campaign.id, recipients: recipientsToInsert.length }, { status: 201 })
}
