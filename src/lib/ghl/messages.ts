import { ghlFetch } from './client'

/**
 * GHL API v2 — Envío de mensajes (SMS)
 *
 * Endpoint: POST /conversations/messages
 * El SMS se envía al número de teléfono del contacto (contactId).
 */

interface SendMessageResponse {
  conversationId?: string
  messageId?: string
  messageIds?: string[]
}

export interface SendSMSResult {
  messageId: string | null
  conversationId: string | null
}

/**
 * Envía un SMS a un contacto de GHL.
 * Lanza GHLError si la API responde con error (el caller decide cómo manejarlo).
 */
export async function sendSMS(contactId: string, message: string): Promise<SendSMSResult> {
  const data = await ghlFetch<SendMessageResponse>('/conversations/messages', {
    method: 'POST',
    body: {
      type: 'SMS',
      contactId,
      message,
    },
  })

  return {
    messageId: data.messageId ?? data.messageIds?.[0] ?? null,
    conversationId: data.conversationId ?? null,
  }
}
