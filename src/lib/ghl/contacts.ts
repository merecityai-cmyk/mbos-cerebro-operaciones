import { ghlFetch } from './client'
import type { GHLContact } from '@/types/ghl'

interface GHLContactResponse {
  contact: GHLContact
}

interface GHLContactsSearchResponse {
  contacts: GHLContact[]
  count: number
  total: number
  traceId?: string
}

// La etiqueta que identifica clientes activos de United Draft en GHL
export const UNITED_DRAFT_CLIENT_TAG = 'cliente united'

/**
 * Obtiene un contacto de GHL por su ID.
 */
export async function getContactById(
  contactId: string
): Promise<GHLContact | null> {
  const data = await ghlFetch<GHLContactResponse>(`/contacts/${contactId}`)
  return data.contact ?? null
}

/**
 * Obtiene TODOS los contactos con la etiqueta "cliente united" en la location.
 * Pagina automáticamente hasta recuperar todos.
 *
 * Estos son los únicos contactos que el job diario debe procesar.
 */
export async function getUnitedDraftClients(
  locationId: string
): Promise<GHLContact[]> {
  const allContacts: GHLContact[] = []
  let skip = 0
  const limit = 100

  while (true) {
    const data = await ghlFetch<GHLContactsSearchResponse>('/contacts/', {
      params: {
        locationId,
        tags: UNITED_DRAFT_CLIENT_TAG,
        limit,
        skip,
      },
    })

    const batch = data.contacts ?? []
    allContacts.push(...batch)

    // Si recibimos menos de `limit`, llegamos al final
    if (batch.length < limit) break

    skip += limit
  }

  return allContacts
}

/**
 * Busca contactos por nombre o email en una location.
 */
export async function searchContacts(
  locationId: string,
  query: string,
  limit = 20
): Promise<GHLContact[]> {
  const data = await ghlFetch<GHLContactsSearchResponse>('/contacts/', {
    params: { locationId, query, limit },
  })
  return data.contacts ?? []
}

/**
 * Construye el nombre visible de un contacto GHL.
 * Prioriza companyName (clientes empresariales), luego name, luego firstName+lastName.
 */
export function getContactDisplayName(contact: GHLContact): string {
  if (contact.companyName) return contact.companyName
  if (contact.name) return contact.name
  const parts = [contact.firstName, contact.lastName].filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  return contact.email ?? 'Sin nombre'
}
