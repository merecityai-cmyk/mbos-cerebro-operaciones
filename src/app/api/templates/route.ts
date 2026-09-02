import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { messageTemplates } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(150),
  body: z.string().min(1).max(1600),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(messageTemplates).orderBy(desc(messageTemplates.updatedAt))
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [created] = await db
    .insert(messageTemplates)
    .values({ name: parsed.data.name, body: parsed.data.body, createdById: session.user.id as string })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
