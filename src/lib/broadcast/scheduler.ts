import { processBroadcasts } from './process'

let started = false

/**
 * Arranca el scheduler in-process que despacha broadcasts cada 60s.
 * Solo corre en producción (server Node, instancia única en Railway) para
 * evitar que un `pnpm dev` local envíe contra la misma DB de producción.
 */
export function startBroadcastScheduler() {
  if (started) return
  if (process.env.NODE_ENV !== 'production') {
    console.log('[BROADCAST] scheduler NO iniciado (NODE_ENV != production)')
    return
  }
  started = true

  const TICK_MS = 60_000
  const tick = async () => {
    try {
      const stats = await processBroadcasts()
      if (stats.sent || stats.failed || stats.promoted || stats.completed) {
        console.log(
          `[BROADCAST] tick — promovidas:${stats.promoted} enviadas:${stats.sent} fallidas:${stats.failed} completadas:${stats.completed}`
        )
      }
    } catch (e) {
      console.error('[BROADCAST] error en tick:', e)
    }
  }

  // Primer tick a los 10s (deja arrancar el server), luego cada minuto.
  setTimeout(tick, 10_000)
  setInterval(tick, TICK_MS)
  console.log('[BROADCAST] scheduler iniciado (tick cada 60s)')
}
