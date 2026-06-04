import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { weeklyReports, clients } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { SatisfactionBadge } from '@/components/clients/SatisfactionBadge'
import { formatDate } from '@/lib/utils/formatting'
import Link from 'next/link'
import type { SatisfactionLevel } from '@/types'

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; weekId: string }>
}) {
  await requireSession()
  const { clientId, weekId } = await params

  const [report] = await db
    .select({
      id: weeklyReports.id,
      weekStart: weeklyReports.weekStart,
      weekEnd: weeklyReports.weekEnd,
      satisfactionLevel: weeklyReports.satisfactionLevel,
      satisfactionScore: weeklyReports.satisfactionScore,
      satisfactionReasoning: weeklyReports.satisfactionReasoning,
      tasksTotal: weeklyReports.tasksTotal,
      tasksCompleted: weeklyReports.tasksCompleted,
      tasksOverdue: weeklyReports.tasksOverdue,
      tasksPending: weeklyReports.tasksPending,
      completionRate: weeklyReports.completionRate,
      conversationSummary: weeklyReports.conversationSummary,
      keyTopics: weeklyReports.keyTopics,
      generatedAt: weeklyReports.generatedAt,
      clientName: clients.name,
    })
    .from(weeklyReports)
    .innerJoin(clients, eq(weeklyReports.clientId, clients.id))
    .where(and(eq(weeklyReports.clientId, clientId), eq(weeklyReports.id, weekId)))
    .limit(1)

  if (!report) notFound()

  const topics = Array.isArray(report.keyTopics) ? report.keyTopics as string[] : []

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href={`/clients/${clientId}`} className="text-xs text-[#64748B] hover:text-[#1E40AF]">
          ← {report.clientName}
        </Link>
        <h2 className="text-xl font-semibold text-[#0F172A] mt-1">
          Reporte semanal — {report.clientName}
        </h2>
        <p className="text-sm text-[#64748B] mt-0.5">
          {formatDate(report.weekStart)} al {formatDate(report.weekEnd)}
        </p>
      </div>

      {/* Satisfacción */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0F172A]">Satisfacción del cliente</h3>
          <SatisfactionBadge level={report.satisfactionLevel as SatisfactionLevel} score={report.satisfactionScore} size="md" />
        </div>
        <p className="text-sm text-[#0F172A] leading-relaxed">{report.satisfactionReasoning}</p>
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topics.map((topic) => (
              <span key={topic} className="text-xs bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Métricas de tareas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total tareas', value: report.tasksTotal, color: 'text-[#0F172A]' },
          { label: 'Completadas', value: report.tasksCompleted, color: 'text-[#16A34A]' },
          { label: 'Vencidas', value: report.tasksOverdue, color: 'text-[#DC2626]' },
          { label: 'Pendientes', value: report.tasksPending, color: 'text-[#D97706]' },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-[#E2E8F0] rounded-lg p-4">
            <p className="text-xs text-[#64748B] mb-1">{m.label}</p>
            <p className={`text-2xl font-semibold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Resumen conversación */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Resumen de conversaciones</h3>
        <p className="text-sm text-[#0F172A] leading-relaxed">{report.conversationSummary}</p>
      </div>
    </div>
  )
}
