'use client'

import { useState } from 'react'
import { Building2, Check } from 'lucide-react'

interface Client {
  id: string
  name: string
  advisorId: string
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

  async function handleChange(clientId: string, advisorId: string) {
    setSaving(clientId)
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, advisorId } : c))
    try {
      await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedAdvisorId: advisorId }),
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
        <h3 className="text-sm font-semibold text-[#0F172A]">Responsables por cliente</h3>
        <p className="text-xs text-[#64748B] mt-0.5">Cambia la asesora asignada a cada empresa</p>
      </div>
      <div className="divide-y divide-[#F1F5F9]">
        {clients.map((client) => (
          <div key={client.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFC]">
            <Building2 className="h-4 w-4 text-[#94A3B8] flex-shrink-0" />
            <span className="flex-1 text-sm text-[#0F172A] min-w-0 truncate">{client.name}</span>
            <div className="flex items-center gap-2">
              {saved === client.id && <Check className="h-3.5 w-3.5 text-green-500" />}
              <select
                value={client.advisorId}
                onChange={(e) => handleChange(client.id, e.target.value)}
                disabled={saving === client.id}
                className="h-8 text-xs border border-[#E2E8F0] rounded-md px-2 bg-white text-[#0F172A] focus:outline-none focus:border-[#1E40AF] cursor-pointer disabled:opacity-50"
              >
                {advisors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
