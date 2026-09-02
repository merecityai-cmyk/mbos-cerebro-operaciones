import { NextRequest, NextResponse } from 'next/server'
import { processBroadcasts } from '@/lib/broadcast/process'

function validateCronAuth(req: NextRequest): boolean {
  return req.headers.get('authorization')?.replace('Bearer ', '') === process.env.CRON_SECRET
}

/**
 * Procesa la cola de broadcasts (una corrida). El driver principal es el
 * scheduler in-process (ver src/lib/broadcast/scheduler.ts); este endpoint
 * es un respaldo — sirve para un cron externo de Railway o para pruebas.
 */
export async function POST(req: NextRequest) {
  if (!validateCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = await processBroadcasts()
  return NextResponse.json({ ok: true, ...stats })
}
