import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { weeklyReports, clients } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { SatisfactionBadge } from '@/components/clients/SatisfactionBadge'
import { formatDate } from '@/lib/utils/formatting'
import Link from 'next/link'
import type { SatisfactionLevel } from '@/types'

export default async function ReportsPage() {
  await requireSession()

  const reports = await db
    .select({
      id: weeklyReports.id,
      weekStart: weeklyReports.weekStart,
      weekEnd: weeklyReports.weekEnd,
      satisfactionLevel: weeklyReports.satisfactionLevel,
      satisfactionScore: weeklyReports.satisfactionScore,
      tasksTotal: weeklyReports.tasksTotal,
      tasksCompleted: weeklyReports.tasksCompleted,
      generatedAt: weeklyReports.generatedAt,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(weeklyReports)
    .innerJoin(clients, eq(weeklyReports.clientId, clients.id))
    .orderBy(desc(weeklyReports.weekStart), clients.name)
    .limit(100)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[#0F172A]">Reportes semanales</h2>
        <p className="text-sm text-[#64748B] mt-0.5">{reports.length} reportes generados</p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        {reports.length === 0 ? (
          <p className="text-sm text-[#64748B] text-center py-12">
            Los reportes se generan automáticamente cada lunes.<br />
            También puedes ejecutarlo manualmente desde Configuración.
          </p>
        ) : (
          <>
            {/* ── Desktop table ──────────────────────────────────────────────── */}
            <table className="w-full text-sm hidden md:table">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Semana</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Satisfacción</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Tareas</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{r.clientName}</td>
                    <td className="px-4 py-3 text-[#64748B] text-xs">{formatDate(r.weekStart)} — {formatDate(r.weekEnd)}</td>
                    <td className="px-4 py-3">
                      <SatisfactionBadge level={r.satisfactionLevel as SatisfactionLevel} score={r.satisfactionScore} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">{r.tasksCompleted}/{r.tasksTotal}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/reports/${r.clientId}/${r.id}`} className="text-xs text-[#1E40AF] hover:underline">Ver →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Mobile card list ────────────────────────────────────────────── */}
            <div className="md:hidden divide-y divide-[#F1F5F9]">
              {reports.map((r) => (
                <Link key={r.id} href={`/reports/${r.clientId}/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">{r.clientName}</p>
                    <p className="text-xs text-[#64748B] mt-0.5">{formatDate(r.weekStart)} — {formatDate(r.weekEnd)}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">{r.tasksCompleted}/{r.tasksTotal} tareas completadas</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <SatisfactionBadge level={r.satisfactionLevel as SatisfactionLevel} score={r.satisfactionScore} />
                  </div>
                  <span className="text-[#CBD5E1] text-sm flex-shrink-0">›</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
