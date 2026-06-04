// Dashboard principal — Step 10 lo completará con KPIs y charts reales
// Por ahora muestra un placeholder funcional con el shell del layout

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#0F172A]">Dashboard</h2>
        <p className="text-sm text-[#64748B] mt-1">
          Resumen de actividad del equipo
        </p>
      </div>

      {/* KPI cards placeholder — reemplazar en Step 10 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tareas creadas hoy', value: '—' },
          { label: 'Tareas vencidas', value: '—' },
          { label: 'Completadas esta semana', value: '—' },
          { label: 'Satisfacción promedio', value: '—' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-[#E2E8F0] rounded-lg p-4"
          >
            <p className="text-xs font-medium text-[#64748B] mb-2">
              {kpi.label}
            </p>
            <p className="text-2xl font-semibold text-[#0F172A]">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
        <p className="text-sm text-[#64748B] text-center py-8">
          Dashboard completo disponible en Step 10
        </p>
      </div>
    </div>
  )
}
