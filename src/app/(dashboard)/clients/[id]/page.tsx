import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { clients, users, tasks, weeklyReports } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { SatisfactionBadge } from '@/components/clients/SatisfactionBadge'
import { STATUS_LABELS, STATUS_COLORS, formatDate } from '@/lib/utils/formatting'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { SatisfactionLevel, TaskStatus } from '@/types'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession()
  const { id } = await params

  const [client] = await db
    .select({ id: clients.id, name: clients.name, advisorName: users.name })
    .from(clients)
    .innerJoin(users, eq(clients.assignedAdvisorId, users.id))
    .where(eq(clients.id, id))
    .limit(1)

  if (!client) notFound()

  const clientTasks = await db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate, advisorName: users.name })
    .from(tasks)
    .innerJoin(users, eq(tasks.assignedToId, users.id))
    .where(eq(tasks.clientId, id))
    .orderBy(desc(tasks.createdAt))
    .limit(20)

  const reports = await db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.clientId, id))
    .orderBy(desc(weeklyReports.weekStart))
    .limit(12)

  const lastReport = reports[0]

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <Link href="/clients" className="text-xs text-[#64748B] hover:text-[#1E40AF]">← Clientes</Link>
        <h2 className="text-xl font-semibold text-[#0F172A] mt-1">{client.name}</h2>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-sm text-[#64748B]">Asesora: {client.advisorName}</span>
          {lastReport && <SatisfactionBadge level={lastReport.satisfactionLevel as SatisfactionLevel} score={lastReport.satisfactionScore} />}
        </div>
      </div>

      {/* Tareas recientes */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <h3 className="text-sm font-semibold text-[#0F172A]">Tareas recientes</h3>
        </div>
        {clientTasks.length === 0 ? (
          <p className="text-sm text-[#64748B] text-center py-8">Sin tareas</p>
        ) : (
          <>
            {/* Desktop table */}
            <table className="w-full text-sm hidden md:table">
              <tbody className="divide-y divide-[#F1F5F9]">
                {clientTasks.map((t) => {
                  const colors = STATUS_COLORS[t.status as TaskStatus]
                  return (
                    <tr key={t.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-5 py-3 font-medium text-[#0F172A]">{t.title}</td>
                      <td className="px-5 py-3">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded border', colors.bg, colors.text, colors.border)}>
                          {STATUS_LABELS[t.status as TaskStatus]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[#64748B] text-xs">{t.advisorName}</td>
                      <td className="px-5 py-3 text-[#64748B] text-xs">{t.dueDate ? formatDate(t.dueDate) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-[#F1F5F9]">
              {clientTasks.map((t) => {
                const colors = STATUS_COLORS[t.status as TaskStatus]
                return (
                  <div key={t.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-[#0F172A] flex-1">{t.title}</p>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded border flex-shrink-0', colors.bg, colors.text, colors.border)}>
                        {STATUS_LABELS[t.status as TaskStatus]}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      {t.advisorName}{t.dueDate ? ` · ${formatDate(t.dueDate)}` : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Reportes semanales */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <h3 className="text-sm font-semibold text-[#0F172A]">Reportes semanales</h3>
        </div>
        {reports.length === 0 ? (
          <p className="text-sm text-[#64748B] text-center py-8">Sin reportes aún</p>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {reports.map((r) => (
              <div key={r.id} className="px-4 md:px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-xs text-[#64748B]">{formatDate(r.weekStart)} — {formatDate(r.weekEnd)}</p>
                    <SatisfactionBadge level={r.satisfactionLevel as SatisfactionLevel} score={r.satisfactionScore} />
                  </div>
                  <p className="text-sm text-[#0F172A] line-clamp-2">{r.conversationSummary}</p>
                  <p className="text-xs text-[#64748B] mt-1">{r.tasksCompleted}/{r.tasksTotal} tareas completadas</p>
                </div>
                <Link href={`/reports/${id}/${r.id}`} className="text-xs text-[#1E40AF] hover:underline flex-shrink-0">Ver →</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
