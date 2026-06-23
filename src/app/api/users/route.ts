import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['advisor', 'manager']),
})

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const all = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .orderBy(users.name)
  return NextResponse.json(all)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, email, password, role } = parsed.data
  const passwordHash = await bcrypt.hash(password, 12)

  const [user] = await db.insert(users).values({ name, email, passwordHash, role }).returning({
    id: users.id, name: users.name, email: users.email, role: users.role,
  })

  return NextResponse.json(user, { status: 201 })
}
