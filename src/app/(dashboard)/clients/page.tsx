import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { clients, users, weeklyReports, tasks } from '@/lib/db/schema'
import { eq, desc, count, and, eq as drizzleEq } from 'drizzle-orm'
import { SatisfactionBadge } from '@/components/clients/SatisfactionBadge'
import { getInitials } from '@/lib/utils/formatting'
import Link from 'next/link'
import type { SatisfactionLevel } from '@/types'

export default async function ClientsPage() {
  await requireSession()

  const allClients = await db
    .select({
      id: clients.id,
      name: clients.name,
      ghlContactId: clients.ghlContactId,
      advisorId: users.id,
      advisorName: users.name,
    })
    .from(clients)
    .innerJoin(users, eq(clients.assignedAdvisorId, users.id))
    .orderBy(clients.name)

  // Para cada cliente, obtener el último reporte y tareas activas
  const enriched = await Promise.all(
    allClients.map(async (c) => {
      const [lastReport] = await db
        .select({
          satisfactionLevel: weeklyReports.satisfactionLevel,
          satisfactionScore: weeklyReports.satisfactionScore,
          weekStart: weeklyReports.weekStart,
        })
        .from(weeklyReports)
        .where(eq(weeklyReports.clientId, c.id))
        .orderBy(desc(weeklyReports.weekStart))
        .limit(1)

      const [activeTasks] = await db
        .select({ count: count() })
        .from(tasks)
        .where(and(
          eq(tasks.clientId, c.id),
          drizzleEq(tasks.status, 'pending')
        ))

      return { ...c, lastReport: lastReport ?? null, activeTasks: activeTasks.count }
    })
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[#0F172A]">Clientes</h2>
        <p className="text-sm text-[#64748B] mt-0.5">{allClients.length} clientes registrados</p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Asesora</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Satisfacción</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Tareas pendientes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {enriched.map((c) => (
              <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#0F172A]">{c.name}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-semibold text-[#1E40AF]">{getInitials(c.advisorName)}</span>
                    </div>
                    <span className="text-[#64748B]">{c.advisorName}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {c.lastReport ? (
                    <SatisfactionBadge
                      level={c.lastReport.satisfactionLevel as SatisfactionLevel}
                      score={c.lastReport.satisfactionScore}
                    />
                  ) : (
                    <span className="text-xs text-[#94A3B8]">Sin reporte</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${c.activeTasks > 0 ? 'text-[#D97706]' : 'text-[#64748B]'}`}>
                    {c.activeTasks}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/clients/${c.id}`} className="text-xs text-[#1E40AF] hover:underline">
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
