import { NextRequest, NextResponse, after } from 'next/server'
import { runDailyAnalysis } from '@/lib/analysis/daily-analysis'

// ─── Auth del cron ─────────────────────────────────────────────────────────
function validateCronAuth(req: NextRequest): boolean {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  return token === process.env.CRON_SECRET
}

/**
 * Dispara el análisis de conversaciones (CRM → tareas).
 * El driver automático es el scheduler in-process (src/lib/analysis/scheduler.ts,
 * 2 veces al día); este endpoint queda como trigger manual y respaldo.
 */
export async function POST(req: NextRequest) {
  if (!validateCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // after() mantiene el job vivo aunque la respuesta ya se envió
  after(async () => {
    await runDailyAnalysis().catch((err) => console.error('[ANALYSIS] Error fatal en background:', err))
  })

  return NextResponse.json({ status: 'started', message: 'Job lanzado en background' }, { status: 202 })
}
