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

// Prefijos que identifican grupos de clientes de United Draft en Merecity.
// Fuente única de verdad: la usan también sync-groups y analyze-conversations.
// 'ud-' cubre "UD- AZ", "UD-AZ" y "UD- Luisa"; 'udt-' cubre las variantes UDT-.
export const CLIENT_PREFIXES = ['adm', 'ud-', 'udt-']

/**
 * ¿El nombre del contacto corresponde a un grupo de cliente de United Draft?
 * (empieza con ADM / UD- / UDT-)
 */
export function hasValidClientPrefix(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return CLIENT_PREFIXES.some(p => lower.startsWith(p))
}

// Alias interno (compatibilidad con el uso previo en este módulo)
const hasAdmPrefix = hasValidClientPrefix

/**
 * Agrega el tag "cliente united" a un contacto en GHL/Merecity.
 */
async function addClienteUnitedTag(contactId: string, currentTags: string[]): Promise<void> {
  if (currentTags.includes(UNITED_DRAFT_CLIENT_TAG)) return
  await ghlFetch(`/contacts/${contactId}`, {
    method: 'PUT',
    body: { tags: [...currentTags, UNITED_DRAFT_CLIENT_TAG] },
  })
}

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
 * Obtiene contactos con la etiqueta "cliente united" desde Merecity.
 * También busca contactos con prefijo ADM/UD-AZ que no tengan el tag y se lo agrega automáticamente.
 */
export async function getUnitedDraftClients(
  locationId: string
): Promise<GHLContact[]> {
  // 1. Buscar contactos que ya tienen el tag
  const allContacts: GHLContact[] = []
  let page = 1
  while (true) {
    const data = await ghlFetch<GHLContactsSearchPostResponse>('/contacts/search', {
      method: 'POST',
      body: {
        locationId,
        pageLimit: 100,
        page,
        filters: [{ field: 'tags', operator: 'contains', value: UNITED_DRAFT_CLIENT_TAG }],
      },
    })
    const batch = data.contacts ?? []
    allContacts.push(...batch)
    if (batch.length < 100) break
    page++
  }

  // 2. Buscar todos los contactos y detectar los que tienen prefijo ADM pero no tienen el tag
  try {
    const taggedIds = new Set(allContacts.map(c => c.id))
    let scanPage = 1
    while (true) {
      const data = await ghlFetch<GHLContactsSearchPostResponse>('/contacts/search', {
        method: 'POST',
        body: { locationId, pageLimit: 100, page: scanPage },
      })
      const batch = data.contacts ?? []
      for (const contact of batch) {
        if (taggedIds.has(contact.id)) continue
        const name = getContactDisplayName(contact)
        if (!hasAdmPrefix(name)) continue
        // Auto-etiquetar y agregar a la lista
        await addClienteUnitedTag(contact.id, contact.tags ?? [])
        contact.tags = [...(contact.tags ?? []), UNITED_DRAFT_CLIENT_TAG]
        allContacts.push(contact)
        taggedIds.add(contact.id)
        console.log(`[GHL] Auto-etiquetado: "${name}" → cliente united`)
      }
      if (batch.length < 100) break
      scanPage++
    }
  } catch (err) {
    console.error('[GHL] Error en auto-etiquetado de contactos ADM:', err)
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
