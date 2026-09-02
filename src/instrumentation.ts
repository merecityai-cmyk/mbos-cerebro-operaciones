/**
 * Next.js instrumentation — se ejecuta una vez al arrancar el server.
 * Aquí levantamos el scheduler in-process de broadcasts.
 */
export async function register() {
  // Solo en el runtime Node (no en edge). Evita correr en el build/edge.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { startBroadcastScheduler } = await import('@/lib/broadcast/scheduler')
  startBroadcastScheduler()
}
