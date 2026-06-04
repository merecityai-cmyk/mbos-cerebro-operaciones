import { ghlFetch } from './client'
import type { GHLTask, GHLTaskResponse } from '@/types/ghl'

interface CreateGHLTaskParams {
  title: string
  description?: string
  dueDate?: string // ISO date string YYYY-MM-DD
  contactId: string
  assignedUserId?: string // GHL user ID del asignado
}

/**
 * Crea una tarea en GHL asociada a un contacto.
 * Retorna el ID de la tarea creada o null si falla.
 */
export async function createGHLTask(
  params: CreateGHLTaskParams
): Promise<string | null> {
  const { title, description, dueDate, contactId, assignedUserId } = params

  // GHL espera la fecha como timestamp Unix en ms o string ISO
  const dueDateFormatted = dueDate
    ? new Date(`${dueDate}T23:59:00-05:00`).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días por defecto

  const body: Record<string, unknown> = {
    title,
    body: description ?? '',
    dueDate: dueDateFormatted,
    completed: false,
    contactId,
    ...(assignedUserId ? { assignedTo: assignedUserId } : {}),
  }

  const data = await ghlFetch<GHLTaskResponse>(
    `/contacts/${contactId}/tasks`,
    {
      method: 'POST',
      body,
    }
  )

  return data.task?.id ?? null
}

/**
 * Actualiza el estado de una tarea en GHL.
 * GHL usa `completed: true/false`, no un enum de estados.
 */
export async function updateGHLTaskStatus(
  contactId: string,
  taskId: string,
  completed: boolean
): Promise<void> {
  await ghlFetch<GHLTaskResponse>(
    `/contacts/${contactId}/tasks/${taskId}`,
    {
      method: 'PUT',
      body: { completed },
    }
  )
}

/**
 * Actualiza el usuario asignado de una tarea en GHL.
 */
export async function updateGHLTaskAssignee(
  contactId: string,
  taskId: string,
  assignedUserId: string
): Promise<void> {
  await ghlFetch<GHLTaskResponse>(
    `/contacts/${contactId}/tasks/${taskId}`,
    {
      method: 'PUT',
      body: { assignedTo: assignedUserId },
    }
  )
}

/**
 * Obtiene el estado actual de una tarea en GHL.
 * Usado por el job de sync para reconciliar estados.
 */
export async function getGHLTask(
  contactId: string,
  taskId: string
): Promise<GHLTask | null> {
  const data = await ghlFetch<GHLTaskResponse>(
    `/contacts/${contactId}/tasks/${taskId}`
  )
  return data.task ?? null
}

/**
 * Mapea el estado de GHL al enum local.
 * GHL solo tiene completed: true/false.
 * - completed: true  → 'completed'
 * - completed: false → 'pending' (el job de sync no puede distinguir in_progress)
 */
export function mapGHLStatusToLocal(
  ghlCompleted: boolean
): 'completed' | 'pending' {
  return ghlCompleted ? 'completed' : 'pending'
}
