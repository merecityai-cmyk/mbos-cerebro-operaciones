import { requireRole } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { taskRoutingRules, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { TriggerJobButton } from './TriggerJobButton'

export default async function SettingsPage() {
  await requireRole('manager')

  const rules = await db
    .select({
      id: taskRoutingRules.id,
      keyword: taskRoutingRules.keyword,
      priority: taskRoutingRules.priority,
      advisorName: users.name,
    })
    .from(taskRoutingRules)
    .innerJoin(users, eq(taskRoutingRules.assignedToId, users.id))
    .orderBy(taskRoutingRules.priority)

  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .orderBy(users.name)

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-[#0F172A]">Configuración</h2>
        <p className="text-sm text-[#64748B] mt-0.5">Solo visible para el gerente</p>
      </div>

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
        <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <p className="text-xs text-[#64748B]">
            Para agregar o modificar reglas, edita la tabla <code className="bg-[#E2E8F0] px-1 rounded">task_routing_rules</code> directamente en la base de datos.
          </p>
        </div>
      </div>

      {/* Usuarios del sistema */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <h3 className="text-sm font-semibold text-[#0F172A]">Usuarios del sistema</h3>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-[#F1F5F9]">
            {allUsers.map((u) => (
              <tr key={u.id} className="hover:bg-[#F8FAFC]">
                <td className="px-5 py-3 font-medium text-[#0F172A]">{u.name}</td>
                <td className="px-5 py-3 text-[#64748B]">{u.email}</td>
                <td className="px-5 py-3">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${u.role === 'manager' ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    {u.role === 'manager' ? 'Gerente' : 'Asesora'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trigger manual del job */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-1">Ejecución manual del job diario</h3>
        <p className="text-xs text-[#64748B] mb-4">
          Fuerza el análisis de conversaciones sin esperar al cron de las 7am UTC.
          Útil para probar o cuando se necesita procesar conversaciones urgentes.
        </p>
        <TriggerJobButton />
      </div>
    </div>
  )
}
