/**
 * Script de prueba REAL con GHL + Claude
 *
 * Uso:
 *   npx tsx src/lib/ghl/test-live.ts
 *
 * Requiere en .env.local:
 *   GHL_API_KEY=...
 *   GHL_LOCATION_ID=...
 *   ANTHROPIC_API_KEY=...
 *
 * Lo que hace:
 * 1. Busca contactos con etiqueta "cliente united" en tu GHL
 * 2. Toma los primeros 5
 * 3. Lee los mensajes recientes de cada conversación
 * 4. Pasa cada conversación a Claude para extraer tareas
 * 5. Muestra los resultados en consola
 */

import 'dotenv/config'
import { getUnitedDraftClients, getContactDisplayName } from './contacts'
import { getContactConversation, getConversationMessages, formatMessagesForClaude } from './conversations'
import { analyzeConversation } from '../ai/analyze-conversation'

const LOCATION_ID = process.env.GHL_LOCATION_ID!
const TEST_LIMIT = 5

async function main() {
  console.log('🔍 Buscando contactos con etiqueta "cliente united"...\n')

  if (!LOCATION_ID) {
    throw new Error('GHL_LOCATION_ID no está configurada en .env.local')
  }
  if (!process.env.GHL_API_KEY) {
    throw new Error('GHL_API_KEY no está configurada en .env.local')
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY no está configurada en .env.local')
  }

  // 1. Obtener clientes tagged
  const allClients = await getUnitedDraftClients(LOCATION_ID)
  console.log(`✓ ${allClients.length} contactos encontrados con tag "cliente united"`)

  const sample = allClients.slice(0, TEST_LIMIT)
  console.log(`\n📋 Procesando los primeros ${sample.length}:\n`)

  // 2. Procesar cada cliente
  for (const contact of sample) {
    const name = getContactDisplayName(contact)
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`👤 Cliente: ${name} (ID: ${contact.id})`)

    try {
      // 3. Obtener conversación activa
      const conversation = await getContactConversation(LOCATION_ID, contact.id)

      if (!conversation) {
        console.log('   ⚠️  Sin conversación activa en GHL')
        continue
      }

      console.log(`   💬 Conversación ID: ${conversation.id}`)
      console.log(`   📅 Último mensaje: ${conversation.lastMessageDate ?? 'N/A'}`)

      // 4. Obtener mensajes
      const { messages } = await getConversationMessages(conversation.id)
      console.log(`   📨 Total mensajes: ${messages.length}`)

      if (messages.length === 0) {
        console.log('   ⚠️  Sin mensajes en la conversación')
        continue
      }

      // Tomar los últimos 30 mensajes para el análisis (ventana razonable)
      const recentMessages = messages.slice(-30)
      const formatted = formatMessagesForClaude(recentMessages)

      if (!formatted || formatted.trim().length < 20) {
        console.log('   ⚠️  Mensajes muy cortos o vacíos para analizar')
        continue
      }

      console.log(`   🤖 Enviando a Claude (${recentMessages.length} mensajes)...`)

      // 5. Analizar con Claude
      const result = await analyzeConversation(name, formatted)

      if (result.tasks.length === 0) {
        console.log('   ✅ Sin tareas pendientes detectadas')
      } else {
        console.log(`   ✅ ${result.tasks.length} tarea(s) detectada(s):`)
        result.tasks.forEach((task, i) => {
          console.log(`\n   Tarea ${i + 1}:`)
          console.log(`     Título:      ${task.title}`)
          console.log(`     Tipo:        ${task.taskType}`)
          console.log(`     Fecha límite: ${task.dueDate ?? 'No especificada'}`)
          console.log(`     Descripción: ${task.description.slice(0, 120)}${task.description.length > 120 ? '...' : ''}`)
        })
      }
    } catch (err) {
      const error = err as Error
      console.log(`   ❌ Error: ${error.message}`)
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log('✅ Prueba completada\n')
}

main().catch((err) => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
