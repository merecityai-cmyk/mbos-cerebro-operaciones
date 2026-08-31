import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { clients, users, kpiMonthlyRecords, kpiChecklistItems } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import Link from 'next/link'
import { MONTH_NAMES } from '@/lib/kpi/phases'
import { cn } from '@/lib/utils'
import { KpiMonthNav } from '@/components/kpi/KpiMonthNav'
import { AlertTriangle } from 'lucide-react'

function pctColor(pct: number | null) {
  if (pct === null) return 'text-[#94A3B8]'
  if (pct >= 80) return 'text-[#059669]'
  if (pct >= 50) return 'text-[#D97706]'
  return 'text-[#DC2626]'
}

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>
}

export default async function KpiDashboardPage({ searchParams }: PageProps) {
  await requireSession()

  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1

  // Mes anterior para alertas
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const allClients = await db
    .select({ id: clients.id, name: clients.name, advisorName: users.name, advisorId: users.id })
    .from(clients)
    .innerJoin(users, eq(clients.assignedAdvisorId, users.id))
    .orderBy(clients.name)

  const clientIds = allClients.map((c) => c.id)
  if (clientIds.length === 0) {
    return <div className="text-sm text-[#64748B] py-10 text-center">Sin empresas registradas</div>
  }

  // Registros mes actual
  const records = await db
    .select()
    .from(kpiMonthlyRecords)
    .where(and(inArray(kpiMonthlyRecords.clientId, clientIds), eq(kpiMonthlyRecords.year, year), eq(kpiMonthlyRecords.month, month)))

  const recordIds = records.map((r) => r.id)
  const allItems = recordIds.length > 0
    ? await db.select().from(kpiChecklistItems).where(inArray(kpiChecklistItems.recordId, recordIds))
    : []

  // Registros mes anterior (para alertas)
  const prevRecords = await db
    .select()
    .from(kpiMonthlyRecords)
    .where(and(inArray(kpiMonthlyRecords.clientId, clientIds), eq(kpiMonthlyRecords.year, prevYear), eq(kpiMonthlyRecords.month, prevMonth)))

  const prevRecordIds = prevRecords.map((r) => r.id)
  const prevItems = prevRecordIds.length > 0
    ? await db.select().from(kpiChecklistItems).where(inArray(kpiChecklistItems.recordId, prevRecordIds))
    : []

  function calcPct(recs: typeof records, items: typeof allItems, clientId: string) {
    const record = recs.find((r) => r.clientId === clientId)
    if (!record) return null
    const its = items.filter((i) => i.recordId === record.id)
    if (its.length === 0) return 0
    return Math.round((its.filter((i) => i.status === 'completed').length / its.length) * 100)
  }

  const clientRows = allClients.map((client) => {
    const record = records.find((r) => r.clientId === client.id)
    const items = record ? allItems.filter((i) => i.recordId === record.id) : []
    const total = items.length
    const completed = items.filter((i) => i.status === 'completed').length
    const inProgress = items.filter((i) => i.status === 'in_progress').length
    const completionPct = record && total > 0 ? Math.round((completed / total) * 100) : record ? 0 : null
    const prevPct = calcPct(prevRecords, prevItems, client.id)
    const prevIncomplete = prevPct !== null && prevPct < 100
    return { ...client, completionPct, completed, total, inProgress, prevPct, prevIncomplete }
  })

  const withRecord = clientRows.filter((c) => c.completionPct !== null)
  const avgPct = withRecord.length > 0
    ? Math.round(withRecord.reduce((s, c) => s + (c.completionPct ?? 0), 0) / withRecord.length)
    : null

  const incompleteAlert = clientRows.filter((c) => c.prevIncomplete)

  // Group by advisor
  const byAdvisor: Record<string, { name: string; clients: typeof clientRows }> = {}
  for (const c of clientRows) {
    if (!byAdvisor[c.advisorId]) byAdvisor[c.advisorId] = { name: c.advisorName, clients: [] }
    byAdvisor[c.advisorId].clients.push(c)
  }

  return (
    <div className="space-y-5">
      {/* Header + navegación de mes */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A]">KPI Empresas</h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            {MONTH_NAMES[month - 1]} {year} — cumplimiento de actividades
          </p>
        </div>
        <KpiMonthNav year={year} month={month} />
      </div>

      {/* Alerta empresas con mes anterior incompleto */}
      {incompleteAlert.length > 0 && (
        <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-lg p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-[#D97706] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#92400E]">
                {incompleteAlert.length} empresa{incompleteAlert.length !== 1 ? 's' : ''} con KPI incompleto en {MONTH_NAMES[prevMonth - 1]}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {incompleteAlert.map((c) => (
                  <Link
                    key={c.id}
                    href={`/kpi/${c.id}/${prevYear}/${prevMonth}`}
                    className="flex items-center gap-1.5 text-xs bg-[#FEF3C7] text-[#92400E] px-2.5 py-1 rounded-full hover:bg-[#FDE68A] transition-colors"
                  >
                    {c.name}
                    <span className="font-bold">{c.prevPct}%</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Empresas activas', value: allClients.length, color: 'text-[#0F172A]' },
          { label: 'Con registro este mes', value: withRecord.length, color: 'text-[#0F172A]' },
          { label: 'Promedio cumplimiento', value: avgPct !== null ? `${avgPct}%` : '—', color: pctColor(avgPct) },
          { label: 'Empresas ≥ 80%', value: withRecord.filter((c) => (c.completionPct ?? 0) >= 80).length, color: 'text-[#059669]' },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-[#E2E8F0] rounded-lg p-4">
            <p className="text-xs text-[#64748B] mb-1">{card.label}</p>
            <p className={cn('text-2xl font-bold', card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Por asesora */}
      {Object.entries(byAdvisor).map(([advisorId, { name, clients: advisorClients }]) => {
        const withRec = advisorClients.filter((c) => c.completionPct !== null)
        const advisorAvg = withRec.length > 0
          ? Math.round(withRec.reduce((s, c) => s + (c.completionPct ?? 0), 0) / withRec.length)
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
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{client.name}</p>
                      {client.prevIncomplete && (
                        <span title={`${MONTH_NAMES[prevMonth - 1]}: ${client.prevPct}%`}>
                          <AlertTriangle className="h-3.5 w-3.5 text-[#D97706] flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    {client.completionPct !== null && (
                      <p className="text-xs text-[#64748B]">
                        {client.completed}/{client.total} completadas
                        {client.inProgress > 0 && ` · ${client.inProgress} en proceso`}
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
