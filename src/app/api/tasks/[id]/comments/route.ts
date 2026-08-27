import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { taskComments, users } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { z } from 'zod'

type Params = { id: string }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const comments = await db
    .select({
      id: taskComments.id,
      content: taskComments.content,
      driveLink: taskComments.driveLink,
      createdAt: taskComments.createdAt,
      userName: users.name,
      userId: users.id,
    })
    .from(taskComments)
    .innerJoin(users, eq(taskComments.userId, users.id))
    .where(eq(taskComments.taskId, id))
    .orderBy(asc(taskComments.createdAt))

  return NextResponse.json(comments)
}

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
  driveLink: z.string().url().optional().or(z.literal('')),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = commentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [comment] = await db
    .insert(taskComments)
    .values({
      taskId: id,
      userId: session.user.id as string,
      content: parsed.data.content,
      driveLink: parsed.data.driveLink || null,
    })
    .returning()

  const [withUser] = await db
    .select({
      id: taskComments.id,
      content: taskComments.content,
      driveLink: taskComments.driveLink,
      createdAt: taskComments.createdAt,
      userName: users.name,
      userId: users.id,
    })
    .from(taskComments)
    .innerJoin(users, eq(taskComments.userId, users.id))
    .where(eq(taskComments.id, comment.id))

  return NextResponse.json(withUser, { status: 201 })
}
