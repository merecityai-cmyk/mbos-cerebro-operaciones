import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { tasks, clients, users, weeklyReports, kpiMonthlyRecords, kpiChecklistItems } from '@/lib/db/schema'
import { eq, and, gte, lt, count, avg, desc, inArray } from 'drizzle-orm'
import { KPICard } from '@/components/dashboard/KPICard'
import { AlertBanner } from '@/components/dashboard/AlertBanner'
import { getColombiaDate, startOfDay, startOfWeek, endOfWeek, subtractDays, toDateString } from '@/lib/utils/dates'
import { formatDateShort } from '@/lib/utils/formatting'
import { MONTH_NAMES } from '@/lib/kpi/phases'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await requireSession()
  const now = getColombiaDate()
  const todayStart = startOfDay(now)
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1)
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const [todayCount] = await db
    .select({ count: count() })
    .from(tasks)
    .where(and(gte(tasks.createdAt, todayStart), lt(tasks.createdAt, todayEnd)))

  const [overdueCount] = await db
    .select({ count: count() })
    .from(tasks)
    .where(eq(tasks.status, 'overdue'))

  const [weekTotal] = await db
    .select({ count: count() })
    .from(tasks)
    .where(and(gte(tasks.createdAt, weekStart), lt(tasks.createdAt, weekEnd)))

  const [weekCompleted] = await db
    .select({ count: count() })
    .from(tasks)
    .where(and(
      gte(tasks.createdAt, weekStart),
      lt(tasks.createdAt, weekEnd),
      eq(tasks.status, 'completed')
    ))

  const completionRate = weekTotal.count > 0
    ? Math.round((weekCompleted.count / weekTotal.count) * 100)
    : 0

  // Satisfacción promedio de los últimos reportes
  const [avgSatisfaction] = await db
    .select({ avg: avg(weeklyReports.satisfactionScore) })
    .from(weeklyReports)
    .where(gte(weeklyReports.weekStart, toDateString(subtractDays(now, 30))))

  const avgScore = avgSatisfaction.avg ? Number(Number(avgSatisfaction.avg).toFixed(1)) : null

  // ── Gráfico: tareas por semana (últimas 4 semanas) ────────────────────────

  const weeklyData = await Promise.all(
    [3, 2, 1, 0].map(async (weeksAgo) => {
      const wStart = startOfWeek(subtractDays(now, weeksAgo * 7))
      const wEnd = endOfWeek(subtractDays(now, weeksAgo * 7))
      const [{ count: total }] = await db
        .select({ count: count() })
        .from(tasks)
        .where(and(gte(tasks.createdAt, wStart), lt(tasks.createdAt, wEnd)))
      return { label: formatDateShort(wStart), total, current: weeksAgo === 0 }
    })
  )

  const maxWeekly = Math.max(...weeklyData.map((w) => w.total), 1)

  // ── KPI resumen del mes ───────────────────────────────────────────────────

  const kpiYear = now.getFullYear()
  const kpiMonth = now.getMonth() + 1

  const allClientIds = (await db.select({ id: clients.id }).from(clients)).map((c) => c.id)
  const kpiRecords = allClientIds.length > 0
    ? await db
        .select()
        .from(kpiMonthlyRecords)
        .where(and(
          inArray(kpiMonthlyRecords.clientId, allClientIds),
          eq(kpiMonthlyRecords.year, kpiYear),
          eq(kpiMonthlyRecords.month, kpiMonth),
        ))
    : []

  const kpiRecordIds = kpiRecords.map((r) => r.id)
  const kpiItems = kpiRecordIds.length > 0
    ? await db.select().from(kpiChecklistItems).where(inArray(kpiChecklistItems.recordId, kpiRecordIds))
    : []

  const kpiTotal = kpiItems.length
  const kpiCompleted = kpiItems.filter((i) => i.status === 'completed').length
  const kpiAvgPct = kpiTotal > 0 ? Math.round((kpiCompleted / kpiTotal) * 100) : null

  // ── Tareas urgentes ───────────────────────────────────────────────────────

  const urgentTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      dueDate: tasks.dueDate,
      clientName: clients.name,
      advisorName: users.name,
    })
    .from(tasks)
    .innerJoin(clients, eq(tasks.clientId, clients.id))
    .innerJoin(users, eq(tasks.assignedToId, users.id))
    .where(and(
      eq(tasks.status, 'overdue'),
    ))
    .orderBy(tasks.dueDate)
    .limit(5)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[#0F172A]">
          Hola, {session.user.name} 👋
        </h2>
        <p className="text-sm text-[#64748B] mt-0.5">
          Resumen de actividad del equipo
        </p>
      </div>

      {/* Banner de tareas vencidas */}
      <AlertBanner count={overdueCount.count} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Tareas creadas hoy"
          value={todayCount.count}
          delta="hoy"
          accent="blue"
        />
        <KPICard
          label="Tareas vencidas"
          value={overdueCount.count}
          delta={overdueCount.count > 0 ? 'Requieren atención' : 'Al día'}
          accent={overdueCount.count > 0 ? 'red' : 'green'}
        />
        <KPICard
          label="Completadas esta semana"
          value={`${completionRate}%`}
          delta={`${weekCompleted.count} de ${weekTotal.count}`}
          accent="green"
        />
        <KPICard
          label="Satisfacción promedio"
          value={avgScore ? `${avgScore}/10` : '—'}
          delta={avgScore ? 'Últimos 30 días' : 'Sin reportes aún'}
          accent="amber"
        />
      </div>

      {/* KPI del mes */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">KPI Empresas — {MONTH_NAMES[kpiMonth - 1]}</p>
            <p className="text-xs text-[#64748B]">
              {kpiRecords.length} empresas con registro · {kpiCompleted}/{kpiTotal} actividades completadas
            </p>
          </div>
          <Link href="/kpi" className="text-xs text-[#1E40AF] hover:underline">Ver detalle →</Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${kpiAvgPct ?? 0}%`,
                backgroundColor: (kpiAvgPct ?? 0) >= 80 ? '#059669' : (kpiAvgPct ?? 0) >= 50 ? '#D97706' : '#DC2626',
              }}
            />
          </div>
          <span className="text-lg font-bold text-[#0F172A] w-12 text-right">
            {kpiAvgPct !== null ? `${kpiAvgPct}%` : '—'}
          </span>
        </div>
      </div>

      {/* Fila inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de barras (últimas 4 semanas) */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
          <p className="text-sm font-semibold text-[#0F172A] mb-4">Tareas por semana</p>
          <div className="flex items-end gap-3 h-28">
            {weeklyData.map((w) => (
              <div key={w.label} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-[#0F172A]">
                  {w.total || ''}
                </span>
                <div className="w-full flex items-end" style={{ height: 80 }}>
                  <div
                    className={`w-full rounded-t transition-all ${w.current ? 'bg-[#1E40AF]' : 'bg-[#DBEAFE]'}`}
                    style={{ height: `${Math.max((w.total / maxWeekly) * 100, 4)}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#64748B] text-center">{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tareas urgentes */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[#0F172A]">Tareas vencidas</p>
            <Link href="/tasks" className="text-xs text-[#1E40AF] hover:underline">
              Ver tablero →
            </Link>
          </div>
          {urgentTasks.length === 0 ? (
            <div className="flex items-center justify-center h-20">
              <p className="text-sm text-[#64748B]">✅ Sin tareas vencidas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentTasks.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-2 pb-3 border-b border-[#F1F5F9] last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">{t.title}</p>
                    <p className="text-xs text-[#64748B]">{t.clientName} · {t.advisorName}</p>
                  </div>
                  <span className="text-[10px] font-semibold bg-[#FEE2E2] text-[#DC2626] px-2 py-0.5 rounded flex-shrink-0">
                    VENCIDA
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
