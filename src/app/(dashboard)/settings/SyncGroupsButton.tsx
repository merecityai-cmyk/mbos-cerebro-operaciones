'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

export function SyncGroupsButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSync() {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/internal/sync-groups', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Error al sincronizar')
      else setResult(data)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 h-9 px-4 text-sm font-medium bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Sincronizando...' : 'Sincronizar grupos Merecity'}
      </button>

      {result && (
        <div className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          {result.added} cliente{result.added !== 1 ? 's' : ''} nuevo{result.added !== 1 ? 's' : ''} añadido{result.added !== 1 ? 's' : ''}
          {result.skipped > 0 && <span className="text-[#64748B]"> ({result.skipped} ya existían)</span>}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  )
}
