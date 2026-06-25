'use client'

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

interface TokenTotals {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  callCount: number
}

interface JobRow {
  jobType: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  callCount: number
}

interface UsageData {
  totals: TokenTotals
  byJob: JobRow[]
  estimatedCostUsd: number
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const JOB_LABELS: Record<string, string> = {
  'analyze-conversations': 'Análisis diario',
  'generate-reports': 'Reportes semanales',
}

export function TokenUsagePanel() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/internal/token-usage')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A]">Consumo de tokens IA</h3>
          <p className="text-xs text-[#64748B] mt-0.5">Total acumulado · claude-sonnet-4-6</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 text-[#64748B] hover:text-[#1E40AF] hover:bg-[#DBEAFE] rounded transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !data ? (
        <div className="px-5 py-6 text-xs text-[#64748B]">Cargando...</div>
      ) : data ? (
        <div className="divide-y divide-[#F1F5F9]">
          {/* Totales */}
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] text-[#64748B] uppercase font-semibold mb-1">Entrada</p>
              <p className="text-lg font-bold text-[#0F172A]">{fmt(data.totals.inputTokens)}</p>
              <p className="text-[11px] text-[#94A3B8]">tokens</p>
            </div>
            <div>
              <p className="text-[11px] text-[#64748B] uppercase font-semibold mb-1">Salida</p>
              <p className="text-lg font-bold text-[#0F172A]">{fmt(data.totals.outputTokens)}</p>
              <p className="text-[11px] text-[#94A3B8]">tokens</p>
            </div>
            <div>
              <p className="text-[11px] text-[#64748B] uppercase font-semibold mb-1">Caché leído</p>
              <p className="text-lg font-bold text-[#0F172A]">{fmt(data.totals.cacheReadTokens)}</p>
              <p className="text-[11px] text-[#94A3B8]">tokens</p>
            </div>
            <div>
              <p className="text-[11px] text-[#64748B] uppercase font-semibold mb-1">Costo est.</p>
              <p className="text-lg font-bold text-[#1E40AF]">
                ${data.estimatedCostUsd < 0.01 ? '<0.01' : data.estimatedCostUsd.toFixed(2)}
              </p>
              <p className="text-[11px] text-[#94A3B8]">USD</p>
            </div>
          </div>

          {/* Por job */}
          {data.byJob.length > 0 && (
            <div className="px-5 py-3">
              <p className="text-[11px] font-semibold text-[#64748B] uppercase mb-2">Por proceso</p>
              <div className="space-y-2">
                {data.byJob.map(row => (
                  <div key={row.jobType} className="flex items-center justify-between text-xs">
                    <span className="text-[#0F172A] font-medium">
                      {JOB_LABELS[row.jobType] ?? row.jobType}
                    </span>
                    <div className="flex gap-4 text-[#64748B]">
                      <span>{fmt(row.inputTokens + row.outputTokens)} tokens</span>
                      <span className="text-[#94A3B8]">{row.callCount} llamadas</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-5 py-2.5 bg-[#F8FAFC]">
            <p className="text-[11px] text-[#94A3B8]">
              {data.totals.callCount} llamadas totales · Precios: $3/M entrada, $15/M salida, $0.30/M caché
            </p>
          </div>
        </div>
      ) : (
        <div className="px-5 py-6 text-xs text-[#64748B]">No hay datos disponibles</div>
      )}
    </div>
  )
}
