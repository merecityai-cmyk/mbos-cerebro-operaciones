import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { clients, users, kpiMonthlyRecords, kpiChecklistItems } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import Link from 'next/link'
import { MONTH_NAMES } from '@/lib/kpi/phases'
import { cn } from '@/lib/utils'

function pctColor(pct: number | null) {
  if (pct === null) return 'text-[#94A3B8]'
  if (pct >= 80) return 'text-[#059669]'
  if (pct >= 50) return 'text-[#D97706]'
  return 'text-[#DC2626]'
}

function pctBg(pct: number | null) {
  if (pct === null) return 'bg-[#F1F5F9]'
  if (pct >= 80) return 'bg-[#F0FDF4]'
  if (pct >= 50) return 'bg-[#FFFBEB]'
  return 'bg-[#FEF2F2]'
}

export default async function KpiDashboardPage() {
  const session = await requireSession()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const allClients = await db
    .select({
      id: clients.id,
      name: clients.name,
      advisorName: users.name,
      advisorId: users.id,
    })
    .from(clients)
    .innerJoin(users, eq(clients.assignedAdvisorId, users.id))
    .orderBy(clients.name)

  const clientIds = allClients.map((c) => c.id)

  // Current month records
  const records = clientIds.length > 0
    ? await db
        .select()
        .from(kpiMonthlyRecords)
        .where(and(
          inArray(kpiMonthlyRecords.clientId, clientIds),
          eq(kpiMonthlyRecords.year, year),
          eq(kpiMonthlyRecords.month, month),
        ))
    : []

  const recordIds = records.map((r) => r.id)
  const allItems = recordIds.length > 0
    ? await db
        .select()
        .from(kpiChecklistItems)
        .where(inArray(kpiChecklistItems.recordId, recordIds))
    : []

  const clientRows = allClients.map((client) => {
    const record = records.find((r) => r.clientId === client.id)
    if (!record) return { ...client, completionPct: null, completed: 0, total: 0, inProgress: 0 }
    const items = allItems.filter((i) => i.recordId === record.id)
    const total = items.length
    const completed = items.filter((i) => i.status === 'completed').length
    const inProgress = items.filter((i) => i.status === 'in_progress').length
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
    return { ...client, completionPct, completed, total, inProgress }
  })

  const withRecord = clientRows.filter((c) => c.completionPct !== null)
  const avgPct = withRecord.length > 0
    ? Math.round(withRecord.reduce((s, c) => s + (c.completionPct ?? 0), 0) / withRecord.length)
    : null

  // Group by advisor
  const byAdvisor: Record<string, { name: string; clients: typeof clientRows }> = {}
  for (const c of clientRows) {
    if (!byAdvisor[c.advisorId]) byAdvisor[c.advisorId] = { name: c.advisorName, clients: [] }
    byAdvisor[c.advisorId].clients.push(c)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#0F172A]">KPI Empresas</h2>
        <p className="text-sm text-[#64748B] mt-0.5">
          {MONTH_NAMES[month - 1]} {year} — cumplimiento de actividades por empresa
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
          <p className="text-xs text-[#64748B] mb-1">Empresas activas</p>
          <p className="text-2xl font-bold text-[#0F172A]">{allClients.length}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
          <p className="text-xs text-[#64748B] mb-1">Con registro este mes</p>
          <p className="text-2xl font-bold text-[#0F172A]">{withRecord.length}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
          <p className="text-xs text-[#64748B] mb-1">Promedio cumplimiento</p>
          <p className={cn('text-2xl font-bold', pctColor(avgPct))}>
            {avgPct !== null ? `${avgPct}%` : '—'}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
          <p className="text-xs text-[#64748B] mb-1">Empresas ≥ 80%</p>
          <p className="text-2xl font-bold text-[#059669]">
            {withRecord.filter((c) => (c.completionPct ?? 0) >= 80).length}
          </p>
        </div>
      </div>

      {/* By advisor sections */}
      {Object.entries(byAdvisor).map(([advisorId, { name, clients: advisorClients }]) => {
        const advisorAvg = advisorClients.filter((c) => c.completionPct !== null).length > 0
          ? Math.round(
              advisorClients
                .filter((c) => c.completionPct !== null)
                .reduce((s, c) => s + (c.completionPct ?? 0), 0) /
              advisorClients.filter((c) => c.completionPct !== null).length
            )
          : null

        return (
          <div key={advisorId} className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <p className="text-sm font-semibold text-[#0F172A]">{name}</p>
              <span className={cn('text-sm font-bold', pctColor(advisorAvg))}>
                {advisorAvg !== null ? `${advisorAvg}% promedio` : 'Sin registros'}
              </span>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {advisorClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/kpi/${client.id}/${year}/${month}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">{client.name}</p>
                    {client.completionPct !== null && (
                      <p className="text-xs text-[#64748B]">
                        {client.completed} completadas · {client.inProgress} en proceso · {client.total - client.completed - client.inProgress} pendientes
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {client.completionPct !== null ? (
                      <>
                        <div className="w-24 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${client.completionPct}%`,
                              backgroundColor: client.completionPct >= 80 ? '#059669' : client.completionPct >= 50 ? '#D97706' : '#DC2626',
                            }}
                          />
                        </div>
                        <span className={cn('text-sm font-bold w-10 text-right', pctColor(client.completionPct))}>
                          {client.completionPct}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-[#94A3B8]">Sin iniciar →</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
