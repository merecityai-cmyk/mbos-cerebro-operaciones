import { ghlFetch } from './client'
import type { GHLContact } from '@/types/ghl'

interface GHLContactResponse {
  contact: GHLContact
}

interface GHLContactsSearchResponse {
  contacts: GHLContact[]
  count: number
}

/**
 * Obtiene un contacto de GHL por su ID.
 */
export async function getContactById(
  contactId: string
): Promise<GHLContact | null> {
  const data = await ghlFetch<GHLContactResponse>(
    `/contacts/${contactId}`
  )
  return data.contact ?? null
}

/**
 * Busca contactos por nombre o email en una location.
 * Útil para verificar que el contacto existe antes de crear tareas.
 */
export async function searchContacts(
  locationId: string,
  query: string,
  limit = 20
): Promise<GHLContact[]> {
  const data = await ghlFetch<GHLContactsSearchResponse>(
    '/contacts/',
    {
      params: {
        locationId,
        query,
        limit,
      },
    }
  )
  return data.contacts ?? []
}

/**
 * Construye el nombre completo de un contacto GHL.
 * Prioriza `name`, luego construye desde firstName + lastName.
 */
export function getContactDisplayName(contact: GHLContact): string {
  if (contact.name) return contact.name
  const parts = [contact.firstName, contact.lastName].filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  return contact.companyName ?? contact.email ?? 'Sin nombre'
}
