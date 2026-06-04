// Placeholder — Step 14 implementará la página de configuración
import { requireRole } from '@/lib/auth/helpers'

export default async function SettingsPage() {
  await requireRole('manager')
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[#0F172A]">Configuración</h2>
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 text-center">
        <p className="text-sm text-[#64748B]">Configuración — disponible en Step 14</p>
      </div>
    </div>
  )
}
