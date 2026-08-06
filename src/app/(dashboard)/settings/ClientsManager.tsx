'use client'

import { useState } from 'react'
import { Building2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  name: string
  advisorId: string
  hasNomina: boolean
  nominaCycle: number | null
  hasDocumentosSoporte: boolean
}

interface Advisor {
  id: string
  name: string
}

interface ClientsManagerProps {
  initialClients: Client[]
  advisors: Advisor[]
}

export function ClientsManager({ initialClients, advisors }: ClientsManagerProps) {
  const [clients, setClients] = useState(initialClients)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function patch(clientId: string, data: Partial<Client>) {
    setSaving(clientId)
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...data } : c))
    try {
      await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.advisorId
          ? { assignedAdvisorId: data.advisorId }
          : data),
      })
      setSaved(clientId)
      setTimeout(() => setSaved(null), 1500)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E2E8F0]">
        <h3 className="text-sm font-semibold text-[#0F172A]">Gestión de clientes</h3>
        <p className="text-xs text-[#64748B] mt-0.5">Asigna asesoras y configura los módulos KPI de cada empresa</p>
      </div>
      <div className="divide-y divide-[#F1F5F9]">
        {clients.map((client) => {
          const isExpanded = expanded === client.id
          return (
            <div key={client.id}>
              <div className="flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFC]">
                <Building2 className="h-4 w-4 text-[#94A3B8] flex-shrink-0" />
                <span className="flex-1 text-sm text-[#0F172A] min-w-0 truncate">{client.name}</span>
                <div className="flex items-center gap-2">
                  {saved === client.id && <Check className="h-3.5 w-3.5 text-green-500" />}
                  <select
                    value={client.advisorId}
                    onChange={(e) => patch(client.id, { advisorId: e.target.value })}
                    disabled={saving === client.id}
                    className="h-8 text-xs border border-[#E2E8F0] rounded-md px-2 bg-white text-[#0F172A] focus:outline-none focus:border-[#1E40AF] cursor-pointer disabled:opacity-50"
                  >
                    {advisors.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : client.id)}
                    className="h-8 w-8 flex items-center justify-center border border-[#E2E8F0] rounded-md hover:bg-[#F1F5F9] text-[#64748B]"
                    title="Configurar KPI"
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] space-y-3">
                  <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Configuración KPI</p>

                  {/* Nómina */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-[#0F172A]">Maneja nómina</label>
                      <p className="text-xs text-[#64748B]">Activa el módulo de nómina en el KPI mensual</p>
                    </div>
                    <button
                      onClick={() => patch(client.id, { hasNomina: !client.hasNomina, nominaCycle: !client.hasNomina ? client.nominaCycle : null })}
                      disabled={saving === client.id}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50',
                        client.hasNomina ? 'bg-[#1E40AF]' : 'bg-[#E2E8F0]'
                      )}
                    >
                      <span className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        client.hasNomina ? 'translate-x-6' : 'translate-x-1'
                      )} />
                    </button>
                  </div>

                  {client.hasNomina && (
                    <div className="flex items-center gap-3 pl-4">
                      <label className="text-xs text-[#64748B]">Ciclo de nómina:</label>
                      {[10, 15, 30].map((days) => (
                        <button
                          key={days}
                          onClick={() => patch(client.id, { nominaCycle: days })}
                          disabled={saving === client.id}
                          className={cn(
                            'text-xs px-3 py-1 rounded-full border transition-colors',
                            client.nominaCycle === days
                              ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                              : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#1E40AF]'
                          )}
                        >
                          c/{days}d
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Documentos soporte */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-[#0F172A]">Documentos soporte</label>
                      <p className="text-xs text-[#64748B]">Cuentas de cobro y facturas del extranjero</p>
                    </div>
                    <button
                      onClick={() => patch(client.id, { hasDocumentosSoporte: !client.hasDocumentosSoporte })}
                      disabled={saving === client.id}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50',
                        client.hasDocumentosSoporte ? 'bg-[#1E40AF]' : 'bg-[#E2E8F0]'
                      )}
                    >
                      <span className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        client.hasDocumentosSoporte ? 'translate-x-6' : 'translate-x-1'
                      )} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
