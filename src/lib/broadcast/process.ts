import { db } from '@/lib/db'
import { broadcastCampaigns, broadcastRecipients } from '@/lib/db/schema'
import { and, eq, lte, asc } from 'drizzle-orm'
import { sendSMS } from '@/lib/ghl/messages'
import { GHLError } from '@/lib/ghl/client'

export interface ProcessStats {
  promoted: number
  sent: number
  failed: number
  completed: number
}

// Lock en memoria para que dos ticks (o tick + endpoint) no se pisen dentro del mismo proceso.
let running = false

/**
 * Procesa las campañas de broadcast:
 *  1. Promueve las 'scheduled' cuya hora ya llegó a 'sending'.
 *  2. Por cada campaña 'sending', si pasó el intervalo desde el último envío,
 *     despacha EL SIGUIENTE grupo pendiente (uno por corrida = espaciado garantizado).
 *  3. Cuando no quedan pendientes, marca la campaña como 'completed'.
 *
 * Diseñado para correr cada ~60s. Es idempotente y sobrevive reinicios:
 * el estado vive en la DB, no en memoria.
 */
export async function processBroadcasts(): Promise<ProcessStats> {
  const stats: ProcessStats = { promoted: 0, sent: 0, failed: 0, completed: 0 }
  if (running) return stats
  running = true

  try {
    const now = new Date()

    // 1. Promover scheduled -> sending
    const toStart = await db
      .select()
      .from(broadcastCampaigns)
      .where(and(eq(broadcastCampaigns.status, 'scheduled'), lte(broadcastCampaigns.scheduledAt, now)))

    for (const c of toStart) {
      await db
        .update(broadcastCampaigns)
        .set({ status: 'sending', startedAt: now, updatedAt: now })
        .where(eq(broadcastCampaigns.id, c.id))
      stats.promoted++
    }

    // 2. Procesar campañas activas
    const active = await db
      .select()
      .from(broadcastCampaigns)
      .where(eq(broadcastCampaigns.status, 'sending'))

    for (const c of active) {
      // ¿Toca enviar? Espaciado: al menos intervalMinutes desde el último despacho.
      const intervalMs = c.intervalMinutes * 60_000
      const readyBySpacing =
        !c.lastSentAt || Date.now() - new Date(c.lastSentAt).getTime() >= intervalMs
      if (!readyBySpacing) continue

      // Siguiente pendiente (menor orderIndex)
      const [next] = await db
        .select()
        .from(broadcastRecipients)
        .where(and(eq(broadcastRecipients.campaignId, c.id), eq(broadcastRecipients.status, 'pending')))
        .orderBy(asc(broadcastRecipients.orderIndex))
        .limit(1)

      if (!next) {
        // No quedan pendientes -> completar
        await db
          .update(broadcastCampaigns)
          .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
          .where(eq(broadcastCampaigns.id, c.id))
        stats.completed++
        continue
      }

      // Enviar SMS a este grupo
      try {
        if (!next.ghlContactId) throw new Error('El grupo no tiene contacto de GHL asociado')
        const res = await sendSMS(next.ghlContactId, c.message)
        await db
          .update(broadcastRecipients)
          .set({ status: 'sent', sentAt: new Date(), ghlMessageId: res.messageId })
          .where(eq(broadcastRecipients.id, next.id))
        stats.sent++
      } catch (err) {
        const msg = err instanceof GHLError ? err.message : err instanceof Error ? err.message : String(err)
        await db
          .update(broadcastRecipients)
          .set({ status: 'failed', sentAt: new Date(), error: msg })
          .where(eq(broadcastRecipients.id, next.id))
        stats.failed++
        console.error(`[BROADCAST] Falló envío a recipient ${next.id}: ${msg}`)
      }

      // Avanzar el reloj de espaciado (éxito o fallo cuentan como intento)
      await db
        .update(broadcastCampaigns)
        .set({ lastSentAt: new Date(), updatedAt: new Date() })
        .where(eq(broadcastCampaigns.id, c.id))
    }

    return stats
  } finally {
    running = false
  }
}
