import { ghlFetch } from './client'
import type { GHLContact } from '@/types/ghl'

interface GHLContactResponse {
  contact: GHLContact
}

interface GHLContactsSearchResponse {
  contacts: GHLContact[]
  count?: number
  total?: number
  traceId?: string
  meta?: {
    total: number
    nextPage?: number
    prevPage?: number | null
    startAfterId?: string
    startAfter?: number
    nextPageUrl?: string
  }
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

interface GHLContactsSearchPostResponse {
  contacts: GHLContact[]
  total?: number
  traceId?: string
}

/**
 * Obtiene contactos con la etiqueta "cliente united" usando el endpoint POST /contacts/search.
 * Mucho más eficiente que paginar todos los contactos y filtrar client-side.
 */
export async function getUnitedDraftClients(
  locationId: string
): Promise<GHLContact[]> {
  const allContacts: GHLContact[] = []
  let page = 1

  while (true) {
    const data = await ghlFetch<GHLContactsSearchPostResponse>('/contacts/search', {
      method: 'POST',
      body: {
        locationId,
        pageLimit: 100,
        page,
        filters: [
          { field: 'tags', operator: 'contains', value: UNITED_DRAFT_CLIENT_TAG },
        ],
      },
    })

    const batch = data.contacts ?? []
    allContacts.push(...batch)

    if (batch.length < 100) break
    page++
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
