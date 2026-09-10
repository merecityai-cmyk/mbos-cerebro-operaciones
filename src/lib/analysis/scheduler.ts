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
 * Scheduler in-process del análisis diario. Reemplaza el cron externo de curl
 * (que fallaba con "curl: command not found"). Cada minuto revisa si ya pasó
 * una ventana programada sin correr; si es así, dispara el job una sola vez.
 * El estado persiste en system_state, así que sobrevive reinicios y NO re-corre
 * en cada deploy. Solo activo en producción.
 */
export function startAnalysisScheduler() {
  if (started) return
  if (process.env.NODE_ENV !== 'production') {
    console.log('[ANALYSIS] scheduler NO iniciado (NODE_ENV != production)')
    return
  }
  started = true

  const tick = async () => {
    try {
      const now = new Date()
      const window = mostRecentWindow(now)
      const lastRun = await getLastRun()
      if (lastRun && lastRun.getTime() >= window.getTime()) return // ya se corrió esta ventana

      console.log(`[ANALYSIS] Ventana ${window.toISOString()} pendiente — disparando análisis`)
      await setLastRun(now) // claim: evita re-disparo en los próximos ticks
      // fire-and-forget: el job tarda ~15-20 min; runDailyAnalysis tiene su propio lock
      runDailyAnalysis().catch((e) => console.error('[ANALYSIS] Error en corrida programada:', e))
    } catch (e) {
      console.error('[ANALYSIS] Error en tick del scheduler:', e)
    }
  }

  // Primer chequeo a los 20s (deja arrancar el server), luego cada minuto.
  setTimeout(tick, 20_000)
  setInterval(tick, 60_000)
  console.log(`[ANALYSIS] scheduler iniciado (ventanas UTC: ${RUN_HOURS_UTC.join(', ')})`)
}
