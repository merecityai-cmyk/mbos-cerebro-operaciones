import Anthropic from '@anthropic-ai/sdk'
import { buildTaskExtractionPrompt } from './prompts'
import type { ConversationAnalysisResult } from '@/types/ai'

// Lazy init — evita instanciar antes de que dotenv cargue las variables
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

// System prompt estático — candidato ideal para prompt caching
const SYSTEM_PROMPT = `Eres un asistente especializado en administración y contabilidad empresarial colombiana para United Draft S.A.S.
Tu rol es analizar conversaciones entre asesores y clientes para extraer tareas pendientes de forma precisa.

Reglas estrictas:
- Extrae SOLO tareas concretas y accionables, no temas generales de conversación
- Si el cliente pregunta algo pero no queda una tarea pendiente, NO la incluyas
- Los títulos deben ser específicos: "Declarar IVA 2do bimestre 2026" es mejor que "Declaración de impuestos"
- Responde SIEMPRE con JSON válido sin markdown ni texto adicional
- Usa terminología colombiana: "declaración de renta", "planilla PILA", "retención en la fuente", etc.`

/**
 * Analiza una conversación de GHL y extrae tareas pendientes usando Claude.
 * Usa prompt caching en el system prompt para reducir costos cuando se
 * procesan múltiples clientes en el mismo job diario.
 */
export async function analyzeConversation(
  clientName: string,
  conversationText: string
): Promise<ConversationAnalysisResult> {
  if (!conversationText || conversationText.trim().length < 20) {
    return { tasks: [] }
  }

  const userPrompt = buildTaskExtractionPrompt(clientName, conversationText)

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        // Cache control: el system prompt es idéntico en todos los clientes del mismo job
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  const rawText =
    message.content[0].type === 'text' ? message.content[0].text : ''

  return parseTaskExtractionResponse(rawText)
}

/**
 * Parsea la respuesta JSON de Claude con manejo robusto de errores.
 * Si el JSON no es válido, retorna tareas vacías y loguea el error.
 */
function parseTaskExtractionResponse(raw: string): ConversationAnalysisResult {
  try {
    // Extrae el JSON aunque haya texto antes/después (defensivo ante alucinaciones)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { tasks: [] }

    const parsed = JSON.parse(jsonMatch[0]) as ConversationAnalysisResult

    if (!Array.isArray(parsed.tasks)) return { tasks: [] }

    // Valida y normaliza cada tarea
    const tasks = parsed.tasks
      .filter(
        (t) =>
          typeof t.title === 'string' &&
          t.title.trim().length > 0
      )
      .map((t) => ({
        title: t.title.trim().slice(0, 80),
        description: typeof t.description === 'string' ? t.description.trim() : '',
        dueDate: isValidDate(t.dueDate) ? t.dueDate : null,
        taskType: typeof t.taskType === 'string' ? t.taskType.trim() : 'general',
      }))

    return { tasks }
  } catch (error) {
    console.error('[AI] Error parseando respuesta de extracción de tareas:', error)
    console.error('[AI] Respuesta raw:', raw.slice(0, 500))
    return { tasks: [] }
  }
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !isNaN(date.getTime())
}
