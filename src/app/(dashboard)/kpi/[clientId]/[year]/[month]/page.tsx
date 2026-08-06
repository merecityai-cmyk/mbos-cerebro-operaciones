import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { clients, users, kpiMonthlyRecords, kpiChecklistItems } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { KpiChecklist } from '@/components/kpi/KpiChecklist'
import { MONTH_NAMES, getClientPhases } from '@/lib/kpi/phases'
import { cn } from '@/lib/utils'

type Params = { clientId: string; year: string; month: string }

export default async function KpiMonthPage({ params }: { params: Promise<Params> }) {
  await requireSession()
  const { clientId, year: yearStr, month: monthStr } = await params
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)

  const [client] = await db
    .select({ id: clients.id, name: clients.name, advisorName: users.name, hasNomina: clients.hasNomina, nominaCycle: clients.nominaCycle, hasDocumentosSoporte: clients.hasDocumentosSoporte })
    .from(clients)
    .innerJoin(users, eq(clients.assignedAdvisorId, users.id))
    .where(eq(clients.id, clientId))
    .limit(1)

  if (!client) notFound()

  const phases = getClientPhases({
    hasNomina: client.hasNomina,
    hasDocumentosSoporte: client.hasDocumentosSoporte,
  })

  let [record] = await db
    .select()
    .from(kpiMonthlyRecords)
    .where(and(
      eq(kpiMonthlyRecords.clientId, clientId),
      eq(kpiMonthlyRecords.year, year),
      eq(kpiMonthlyRecords.month, month),
    ))
    .limit(1)

  if (!record) {
    ;[record] = await db
      .insert(kpiMonthlyRecords)
      .values({ clientId, year, month })
      .returning()

    const itemsToInsert = phases.flatMap((phase, pi) =>
      phase.items.map((item, ii) => ({
        recordId: record.id,
        phase: phase.key,
        itemKey: item.key,
        status: 'pending' as const,
        sortOrder: pi * 100 + ii,
      }))
    )
    if (itemsToInsert.length > 0) {
      await db.insert(kpiChecklistItems).values(itemsToInsert)
    }
  }

  const items = await db
    .select()
    .from(kpiChecklistItems)
    .where(eq(kpiChecklistItems.recordId, record.id))
    .orderBy(kpiChecklistItems.sortOrder)

  const total = items.length
  const completed = items.filter((i) => i.status === 'completed').length
  const inProgress = items.filter((i) => i.status === 'in_progress').length
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0

  // Month navigation: prev and next
  const prevMonth = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }
  const nowY = new Date().getFullYear(), nowM = new Date().getMonth() + 1
  const isNext = nextMonth.y > nowY || (nextMonth.y === nowY && nextMonth.m > nowM)

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-2">
          <Link href="/kpi" className="hover:text-[#1E40AF]">KPI Empresas</Link>
          <span>/</span>
          <span>{client.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#0F172A]">{client.name}</h2>
            <p className="text-sm text-[#64748B] mt-0.5">Asesora: {client.advisorName}</p>
          </div>
          {/* Config badges */}
          <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
            {client.hasNomina && (
              <span className="text-[11px] font-medium bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                Nómina {client.nominaCycle ? `c/${client.nominaCycle}d` : ''}
              </span>
            )}
            {client.hasDocumentosSoporte && (
              <span className="text-[11px] font-medium bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] px-2 py-0.5 rounded-full">
                Doc. Soporte
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-3">
        <Link
          href={`/kpi/${clientId}/${prevMonth.y}/${prevMonth.m}`}
          className="text-xs text-[#64748B] hover:text-[#1E40AF] px-3 py-1.5 border border-[#E2E8F0] rounded-md hover:border-[#1E40AF] transition-colors"
        >
          ← {MONTH_NAMES[prevMonth.m - 1]}
        </Link>
        <span className="text-sm font-semibold text-[#0F172A] flex-1 text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        {!isNext ? (
          <Link
            href={`/kpi/${clientId}/${nextMonth.y}/${nextMonth.m}`}
            className="text-xs text-[#64748B] hover:text-[#1E40AF] px-3 py-1.5 border border-[#E2E8F0] rounded-md hover:border-[#1E40AF] transition-colors"
          >
            {MONTH_NAMES[nextMonth.m - 1]} →
          </Link>
        ) : (
          <span className="w-24" />
        )}
      </div>

      <KpiChecklist
        recordId={record.id}
        items={items}
        observations={record.observations}
        phasesEnabled={phases.map((p) => p.key)}
        stats={{ total, completed, inProgress, completionPct }}
      />
    </div>
  )
}
