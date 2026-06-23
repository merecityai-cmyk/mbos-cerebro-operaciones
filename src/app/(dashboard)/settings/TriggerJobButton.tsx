'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Loader2, CheckCircle, XCircle } from 'lucide-react'

type State = 'idle' | 'running' | 'success' | 'error'

interface JobResult {
  processed: number
  tasksCreated: number
  skipped: number
  errors: string[]
  executionMs: number
}

export function TriggerJobButton() {
  const [state, setState] = useState<State>('idle')
  const [result, setResult] = useState<JobResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setState('running')
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/internal/trigger-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'analyze-conversations' }),
      })

      if (res.status === 401) {
        setError('Sesión expirada — recarga la página')
        setState('error')
        return
      }

      setState('success')
      setResult(null)
      window.dispatchEvent(new Event('job-started'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setState('error')
    }
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={run}
        disabled={state === 'running'}
        size="sm"
        className="bg-[#1E40AF] hover:bg-[#1d3a9e] text-white gap-2"
      >
        {state === 'running' ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Procesando...</>
        ) : (
          <><Play className="h-3.5 w-3.5" /> Ejecutar job ahora</>
        )}
      </Button>

      {state === 'success' && (
        <div className="flex items-start gap-2 text-sm bg-[#F0FDF4] border border-[#16A34A]/20 rounded-md px-3 py-2.5">
          <CheckCircle className="h-4 w-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-[#16A34A]">Job iniciado</p>
            <p className="text-xs text-[#64748B] mt-0.5">Procesando en segundo plano — tarda 4-8 min para los 24 clientes.</p>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-2 text-sm bg-[#FEE2E2] border border-[#DC2626]/20 rounded-md px-3 py-2.5">
          <XCircle className="h-4 w-4 text-[#DC2626]" />
          <p className="text-[#DC2626] font-medium">{error}</p>
        </div>
      )}
    </div>
  )
}
