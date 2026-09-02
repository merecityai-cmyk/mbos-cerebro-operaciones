import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { clients } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'
import { BroadcastPanel } from '@/components/broadcast/BroadcastPanel'

export default async function MensajesPage() {
  await requireSession()

  const groups = await db
    .select({ id: clients.id, name: clients.name, ghlContactId: clients.ghlContactId })
    .from(clients)
    .orderBy(asc(clients.name))

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[#0F172A]">Mensajes masivos</h2>
        <p className="text-sm text-[#64748B] mt-0.5">
          Envía un SMS a los grupos que elijas. Se despacha 1 grupo por minuto para evitar bloqueos.
        </p>
      </div>

      <BroadcastPanel groups={groups} />
    </div>
  )
}
