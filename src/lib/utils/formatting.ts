import type { TaskStatus, SatisfactionLevel } from '@/types'

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
  })
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  const due = new Date(dueDate)
  const now = new Date()
  // Comparar solo fechas (sin hora)
  due.setHours(23, 59, 59, 999)
  return due < now
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completado',
  overdue: 'Vencido',
}

export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-[#F5F3FF]', text: 'text-[#7C3AED]', border: 'border-[#7C3AED]/20' },
  in_progress: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', border: 'border-[#D97706]/20' },
  completed: { bg: 'bg-[#F0FDF4]', text: 'text-[#16A34A]', border: 'border-[#16A34A]/20' },
  overdue: { bg: 'bg-[#FFF5F5]', text: 'text-[#DC2626]', border: 'border-[#DC2626]/20' },
}

export const SATISFACTION_COLORS: Record<SatisfactionLevel, { bg: string; text: string }> = {
  high: { bg: 'bg-[#DCFCE7]', text: 'text-[#16A34A]' },
  medium: { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]' },
  low: { bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]' },
}

export const SATISFACTION_LABELS: Record<SatisfactionLevel, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}
