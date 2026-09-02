import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { clients, users } from '@/lib/db/schema'
import { getUnitedDraftClients, getContactDisplayName, hasValidClientPrefix } from '@/lib/ghl/contacts'
import { eq } from 'drizzle-orm'

const LOCATION_ID = process.env.GHL_LOCATION_ID!

const hasValidPrefix = hasValidClientPrefix

export async function POST() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [manager] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'manager'))
    .limit(1)

  if (!manager) return NextResponse.json({ error: 'No manager found' }, { status: 500 })

  const existingClients = await db.select({ ghlContactId: clients.ghlContactId }).from(clients)
  const existingIds = new Set(existingClients.map(c => c.ghlContactId))

  const ghlContacts = await getUnitedDraftClients(LOCATION_ID)
  const newClients = ghlContacts.filter(c => !existingIds.has(c.id) && hasValidPrefix(getContactDisplayName(c)))

  const added: string[] = []
  for (const contact of newClients) {
    const displayName = getContactDisplayName(contact)
    await db
      .insert(clients)
      .values({ name: displayName, ghlContactId: contact.id, assignedAdvisorId: manager.id })
      .onConflictDoNothing()
    added.push(displayName)
  }

  const skipped = ghlContacts.filter(c => existingIds.has(c.id)).length
  return NextResponse.json({ added: added.length, skipped, total: ghlContacts.length, addedNames: added })
}
