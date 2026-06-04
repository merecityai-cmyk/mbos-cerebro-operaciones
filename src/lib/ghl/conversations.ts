import { ghlFetch } from './client'
import type {
  GHLConversation,
  GHLConversationsResponse,
  GHLMessage,
  GHLMessagesResponse,
} from '@/types/ghl'

/**
 * Lista todas las conversaciones activas de una location.
 * Filtra por contactId si se provee.
 * Usa paginación interna para recuperar hasta `limit` conversaciones.
 */
export async function getConversationsByLocation(
  locationId: string,
  options: {
    contactId?: string
    limit?: number
    startAfterDate?: number // timestamp en ms
  } = {}
): Promise<GHLConversation[]> {
  const { contactId, limit = 100, startAfterDate } = options

  const params: Record<string, string | number | boolean | undefined> = {
    locationId,
    limit,
    ...(contactId ? { contactId } : {}),
    ...(startAfterDate ? { startAfterDate } : {}),
  }

  const data = await ghlFetch<GHLConversationsResponse>('/conversations/search', {
    params,
  })

  return data.conversations ?? []
}

/**
 * Obtiene la conversación activa de un contacto específico.
 * Retorna null si el contacto no tiene conversación.
 */
export async function getContactConversation(
  locationId: string,
  contactId: string
): Promise<GHLConversation | null> {
  const conversations = await getConversationsByLocation(locationId, {
    contactId,
    limit: 1,
  })
  return conversations[0] ?? null
}

/**
 * Obtiene los mensajes de una conversación.
 * Si `afterMessageId` se provee, solo retorna mensajes más nuevos que ese ID.
 */
export async function getConversationMessages(
  conversationId: string,
  afterMessageId?: string
): Promise<{
  messages: GHLMessage[]
  hasMore: boolean
  lastMessageId?: string
}> {
  const params: Record<string, string | number | boolean | undefined> = {
    limit: 100,
    ...(afterMessageId ? { lastMessageId: afterMessageId } : {}),
  }

  const data = await ghlFetch<GHLMessagesResponse>(
    `/conversations/${conversationId}/messages`,
    { params }
  )

  const messages = data.messages?.messages ?? []
  const hasMore = data.messages?.nextPage ?? false
  const lastId =
    data.messages?.lastMessageId ??
    (messages.length > 0 ? messages[messages.length - 1].id : undefined)

  return { messages, hasMore, lastMessageId: lastId }
}

/**
 * Obtiene todos los mensajes nuevos desde el último procesamiento.
 * Compara con `lastMessageId` guardado en conversation_snapshots.
 */
export async function getNewMessages(
  conversationId: string,
  lastProcessedMessageId?: string | null
): Promise<GHLMessage[]> {
  const { messages } = await getConversationMessages(
    conversationId,
    lastProcessedMessageId ?? undefined
  )

  if (!lastProcessedMessageId) return messages

  // Filtra solo mensajes posteriores al último procesado
  const lastIdx = messages.findIndex((m) => m.id === lastProcessedMessageId)
  if (lastIdx === -1) return messages // No encontrado — retornar todos
  return messages.slice(lastIdx + 1)
}

/**
 * Formatea los mensajes de una conversación como texto para Claude.
 * Formato: "[DIRECCIÓN] [FECHA] mensaje"
 */
export function formatMessagesForClaude(messages: GHLMessage[]): string {
  if (messages.length === 0) return ''

  return messages
    .map((msg) => {
      const direction = msg.direction === 'inbound' ? 'Cliente' : 'Asesor'
      const date = new Date(msg.dateAdded ?? msg.createdAt).toLocaleString(
        'es-CO',
        {
          timeZone: 'America/Bogota',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }
      )
      const body = msg.body?.trim() ?? ''
      return `[${direction} - ${date}] ${body}`
    })
    .filter((line) => line.length > 15) // Filtra mensajes vacíos o muy cortos
    .join('\n')
}
