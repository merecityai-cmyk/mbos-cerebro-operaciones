import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { broadcastCampaigns, broadcastRecipients, clients } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [campaign] = await db.select().from(broadcastCampaigns).where(eq(broadcastCampaigns.id, id)).limit(1)
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const recipients = await db
    .select({
      id: broadcastRecipients.id,
      clientId: broadcastRecipients.clientId,
      clientName: clients.name,
      ghlContactId: broadcastRecipients.ghlContactId,
      orderIndex: broadcastRecipients.orderIndex,
      status: broadcastRecipients.status,
      sentAt: broadcastRecipients.sentAt,
      error: broadcastRecipients.error,
    })
    .from(broadcastRecipients)
    .innerJoin(clients, eq(broadcastRecipients.clientId, clients.id))
    .where(eq(broadcastRecipients.campaignId, id))
    .orderBy(asc(broadcastRecipients.orderIndex))

  return NextResponse.json({ campaign, recipients })
}
