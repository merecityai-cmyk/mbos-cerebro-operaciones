import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { job } = await req.json()
  const validJobs = ['analyze-conversations', 'generate-reports', 'sync-ghl-tasks']
  if (!validJobs.includes(job)) {
    return NextResponse.json({ error: 'Invalid job' }, { status: 400 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000'

  // Fire and forget — don't await so the browser doesn't timeout
  fetch(`${baseUrl}/api/cron/${job}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
      'Content-Type': 'application/json',
    },
  }).catch((err) => console.error(`[trigger-job] ${job} error:`, err))

  return NextResponse.json({ status: 'started', job }, { status: 202 })
}
