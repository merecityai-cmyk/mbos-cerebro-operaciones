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
      const res = await fetch('/api/cron/analyze-conversations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}`,
          'Content-Type': 'application/json',
        },
      })

      if (res.status === 401) {
        setError('No autorizado — verifica CRON_SECRET')
        setState('error')
        return
      }

      const data = await res.json()
      setResult(data)
      setState('success')
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

      {state === 'success' && result && (
        <div className="flex items-start gap-2 text-sm bg-[#F0FDF4] border border-[#16A34A]/20 rounded-md px-3 py-2.5">
          <CheckCircle className="h-4 w-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-[#16A34A]">Job completado en {result.executionMs}ms</p>
            <p className="text-xs text-[#64748B] mt-0.5">
              Clientes procesados: {result.processed} · Tareas creadas: {result.tasksCreated} · Omitidos: {result.skipped}
            </p>
            {result.errors?.length > 0 && (
              <p className="text-xs text-[#DC2626] mt-0.5">{result.errors.length} error(es)</p>
            )}
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
