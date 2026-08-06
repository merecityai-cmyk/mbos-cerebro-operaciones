import { requireRole } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { taskRoutingRules, users, clients } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { TriggerJobButton } from './TriggerJobButton'
import { ReportsStatus } from './ReportsStatus'
import { ClientsManager } from './ClientsManager'
import { UsersManager } from './UsersManager'
import { TokenUsagePanel } from './TokenUsagePanel'

export default async function SettingsPage() {
  const session = await requireRole('manager')

  const [rules, allUsers, allClients] = await Promise.all([
    db.select({
      id: taskRoutingRules.id,
      keyword: taskRoutingRules.keyword,
      priority: taskRoutingRules.priority,
      advisorName: users.name,
    })
      .from(taskRoutingRules)
      .innerJoin(users, eq(taskRoutingRules.assignedToId, users.id))
      .orderBy(taskRoutingRules.priority),

    db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .orderBy(users.name),

    db.select({
      id: clients.id,
      name: clients.name,
      advisorId: clients.assignedAdvisorId,
      hasNomina: clients.hasNomina,
      nominaCycle: clients.nominaCycle,
      hasDocumentosSoporte: clients.hasDocumentosSoporte,
    })
      .from(clients)
      .orderBy(clients.name),
  ])

  const advisors = allUsers.filter(u => u.role === 'advisor' || u.role === 'manager')

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-[#0F172A]">Configuración</h2>
        <p className="text-sm text-[#64748B] mt-0.5">Solo visible para el gerente</p>
      </div>

      {/* Gestión de clientes */}
      <ClientsManager initialClients={allClients} advisors={advisors} />

      {/* Gestión de usuarios */}
      <UsersManager initialUsers={allUsers} currentUserId={session.user.id as string} />

      {/* Reglas de routing */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <h3 className="text-sm font-semibold text-[#0F172A]">Reglas de enrutamiento de tareas</h3>
          <p className="text-xs text-[#64748B] mt-0.5">Keywords que determinan qué asesora recibe cada tipo de tarea</p>
        </div>
        {rules.length === 0 ? (
          <p className="text-sm text-[#64748B] text-center py-8">Sin reglas configuradas — usando reglas por defecto</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] uppercase">Keyword</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] uppercase">Asignada a</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] uppercase">Prioridad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-5 py-3">
                    <code className="text-xs bg-[#F1F5F9] px-2 py-0.5 rounded text-[#0F172A]">{r.keyword}</code>
                  </td>
                  <td className="px-5 py-3 text-[#64748B]">{r.advisorName}</td>
                  <td className="px-5 py-3 text-[#64748B]">{r.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Ejecución manual */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-1">Ejecución manual del job diario</h3>
        <p className="text-xs text-[#64748B] mb-4">
          Fuerza el análisis de conversaciones sin esperar al cron de las 7am.
        </p>
        <TriggerJobButton />
      </div>

      <ReportsStatus />

      {/* Consumo de tokens IA */}
      <TokenUsagePanel />
    </div>
  )
}
