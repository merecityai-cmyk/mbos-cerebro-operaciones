import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { broadcastCampaigns } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Cancela una campaña. Los grupos ya enviados quedan enviados;
// los pendientes no se despachan (la campaña deja de estar 'sending'/'scheduled').
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [campaign] = await db.select().from(broadcastCampaigns).where(eq(broadcastCampaigns.id, id)).limit(1)
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (campaign.status === 'completed' || campaign.status === 'cancelled') {
    return NextResponse.json({ error: 'La campaña ya finalizó' }, { status: 400 })
  }

  await db
    .update(broadcastCampaigns)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(broadcastCampaigns.id, id))

  return NextResponse.json({ success: true })
}
