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

/**
 * Obtiene TODOS los contactos con la etiqueta "cliente united" en la location.
 * GHL v2 no filtra por tag en GET /contacts/ — usamos el endpoint de búsqueda
 * por query vacío y filtramos client-side por etiqueta.
 *
 * Estos son los únicos contactos que el job diario debe procesar.
 */
export async function getUnitedDraftClients(
  locationId: string
): Promise<GHLContact[]> {
  const allContacts: GHLContact[] = []
  let startAfterId: string | undefined

  while (true) {
    const params: Record<string, string | number | boolean | undefined> = {
      locationId,
      limit: 100,
      ...(startAfterId ? { startAfterId } : {}),
    }

    const data = await ghlFetch<GHLContactsSearchResponse>('/contacts/', { params })
    const batch = data.contacts ?? []

    // Filtrar client-side: solo contactos con la etiqueta "cliente united"
    const tagged = batch.filter(
      (c) =>
        Array.isArray(c.tags) &&
        c.tags.some(
          (t: string) => t.toLowerCase() === UNITED_DRAFT_CLIENT_TAG.toLowerCase()
        )
    )
    allContacts.push(...tagged)

    // GHL pagina con startAfterId del último elemento
    if (batch.length < 100 || !data.meta?.nextPage) break
    startAfterId = data.meta.startAfterId ?? batch[batch.length - 1].id
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
