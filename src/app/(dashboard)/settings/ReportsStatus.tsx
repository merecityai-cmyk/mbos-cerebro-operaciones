'use client'

import { useEffect, useState } from 'react'
import { FileText, Loader2, CheckCircle } from 'lucide-react'

interface Status {
  generated: number
  total: number
  weekStart: string
}

export function ReportsStatus() {
  const [status, setStatus] = useState<Status | null>(null)
  const [running, setRunning] = useState(false)

  async function fetchStatus() {
    try {
      const res = await fetch('/api/internal/reports-status')
      if (res.ok) setStatus(await res.json())
    } catch {}
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  // Poll every 10s while running
  useEffect(() => {
    if (!running) return
    const interval = setInterval(async () => {
      await fetchStatus()
      if (status && status.generated >= status.total) setRunning(false)
    }, 10000)
    return () => clearInterval(interval)
  }, [running, status])

  // Start polling when job is triggered
  useEffect(() => {
    const handler = () => {
      setRunning(true)
      fetchStatus()
    }
    window.addEventListener('job-started', handler)
    return () => window.removeEventListener('job-started', handler)
  }, [])

  if (!status) return null

  const pct = status.total > 0 ? Math.round((status.generated / status.total) * 100) : 0
  const done = status.generated >= status.total && status.generated > 0

  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {done
            ? <CheckCircle className="h-4 w-4 text-[#16A34A]" />
            : running
            ? <Loader2 className="h-4 w-4 text-[#1E40AF] animate-spin" />
            : <FileText className="h-4 w-4 text-[#64748B]" />
          }
          <span className="text-sm font-medium text-[#0F172A]">
            Reportes semana anterior
          </span>
        </div>
        <span className="text-sm font-semibold text-[#1E40AF]">
          {status.generated} / {status.total}
        </span>
      </div>

      <div className="w-full bg-[#F1F5F9] rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: done ? '#16A34A' : '#1E40AF',
          }}
        />
      </div>

      <p className="text-xs text-[#64748B]">
        {done
          ? `✓ Todos los reportes generados (semana del ${status.weekStart})`
          : running
          ? `Procesando... ${status.generated} de ${status.total} clientes`
          : `${status.generated} reportes generados — semana del ${status.weekStart}`
        }
      </p>
    </div>
  )
}
