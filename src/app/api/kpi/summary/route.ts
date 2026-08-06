import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { clients, users, kpiMonthlyRecords, kpiChecklistItems } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

// GET /api/kpi/summary?year=2025&month=8
// Returns KPI completion for all clients for the given month
export async function GET(req: NextRequest) {
  await requireSession()

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))

  const allClients = await db
    .select({
      id: clients.id,
      name: clients.name,
      advisorName: users.name,
      advisorId: users.id,
    })
    .from(clients)
    .innerJoin(users, eq(clients.assignedAdvisorId, users.id))
    .orderBy(clients.name)

  if (allClients.length === 0) return NextResponse.json([])

  const clientIds = allClients.map((c) => c.id)

  const records = await db
    .select()
    .from(kpiMonthlyRecords)
    .where(and(
      inArray(kpiMonthlyRecords.clientId, clientIds),
      eq(kpiMonthlyRecords.year, year),
      eq(kpiMonthlyRecords.month, month),
    ))

  // For each record, get item counts
  const recordIds = records.map((r) => r.id)
  const allItems = recordIds.length > 0
    ? await db
        .select()
        .from(kpiChecklistItems)
        .where(inArray(kpiChecklistItems.recordId, recordIds))
    : []

  const result = allClients.map((client) => {
    const record = records.find((r) => r.clientId === client.id)
    if (!record) {
      return { ...client, completionPct: null, completed: 0, total: 0, inProgress: 0, recordId: null }
    }
    const items = allItems.filter((i) => i.recordId === record.id)
    const total = items.length
    const completed = items.filter((i) => i.status === 'completed').length
    const inProgress = items.filter((i) => i.status === 'in_progress').length
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
    return { ...client, completionPct, completed, total, inProgress, recordId: record.id }
  })

  return NextResponse.json(result)
}
