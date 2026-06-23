import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { weeklyReports, clients } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { getColombiaDate, startOfWeek, toDateString, subtractDays } from '@/lib/utils/dates'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = getColombiaDate()
  const weekStart = toDateString(startOfWeek(subtractDays(now, 7)))

  const [generated] = await db
    .select({ count: count() })
    .from(weeklyReports)
    .where(eq(weeklyReports.weekStart, weekStart))

  const [total] = await db.select({ count: count() }).from(clients)

  return NextResponse.json({
    generated: generated.count,
    total: total.count,
    weekStart,
  })
}
