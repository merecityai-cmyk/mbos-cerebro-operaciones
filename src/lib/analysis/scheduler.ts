import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { systemState } from '@/lib/db/schema'
import { runDailyAnalysis } from './daily-analysis'

// Horas UTC de las corridas automáticas. 12:00 UTC = 7am Bogotá, 19:00 UTC = 2pm Bogotá.
const RUN_HOURS_UTC = [12, 19]
const STATE_KEY = 'last_analysis_run_at'

let started = false

/**
 * Ventana programada más reciente (<= ahora). Si aún no llegó la primera del
 * día, devuelve la última de ayer.
 */
function mostRecentWindow(now: Date): Date {
  const candidates: Date[] = []
  for (const h of RUN_HOURS_UTC) {
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, 0, 0))
    candidates.push(today)
    candidates.push(new Date(today.getTime() - 24 * 60 * 60 * 1000)) // ayer, por si es temprano
  }
  const past = candidates.filter((d) => d.getTime() <= now.getTime()).sort((a, b) => b.getTime() - a.getTime())
  return past[0]
}

async function getLastRun(): Promise<Date | null> {
  const [row] = await db.select().from(systemState).where(eq(systemState.key, STATE_KEY)).limit(1)
  return row?.value ? new Date(row.value) : null
}

async function setLastRun(when: Date): Promise<void> {
  await db
    .insert(systemState)
    .values({ key: STATE_KEY, value: when.toISOString(), updatedAt: new Date() })
    .onConflictDoUpdate({ target: systemState.key, set: { value: when.toISOString(), updatedAt: new Date() } })
}

/**
 * Scheduler automático DESHABILITADO para Johan Pérez NEX.
 * Johan activa los jobs manualmente desde el dashboard.
 * Esta función existe para compatibilidad con el import en layout pero no hace nada.
 */
export function startAnalysisScheduler() {
  console.log('[ANALYSIS] scheduler deshabilitado — jobs se activan manualmente desde el dashboard')
}
