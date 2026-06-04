import Anthropic from '@anthropic-ai/sdk'
import { buildSatisfactionPrompt } from './prompts'
import type { SatisfactionAnalysisResult } from '@/types/ai'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

const SYSTEM_PROMPT = `Eres un analista de satisfacción de clientes para United Draft S.A.S., empresa de administración y contabilidad colombiana.
Tu rol es evaluar el nivel de satisfacción de cada cliente basándote en sus conversaciones semanales y el cumplimiento de tareas.

Criterios de evaluación:
- Analiza el tono emocional del cliente (frustración, satisfacción, urgencia, neutralidad)
- Considera si los compromisos prometidos fueron cumplidos en el tiempo acordado
- Identifica señales de alarma: quejas directas, mensajes de urgencia repetidos, amenazas de cambio de proveedor
- Un cliente con 0 tareas en la semana puede tener satisfacción "high" si hubo comunicación positiva

Responde SIEMPRE con JSON válido sin markdown ni texto adicional.`

/**
 * Analiza las conversaciones de la semana de un cliente y genera el reporte de satisfacción.
 * Usa prompt caching en el system prompt para el job semanal que procesa todos los clientes.
 */
export async function analyzeSatisfaction(
  clientName: string,
  weekConversations: string,
  stats: {
    tasksTotal: number
    tasksCompleted: number
    tasksOverdue: number
    tasksPending: number
  }
): Promise<SatisfactionAnalysisResult> {
  // Si no hubo conversaciones en la semana, retornar neutral por defecto
  if (!weekConversations || weekConversations.trim().length < 10) {
    return {
      satisfactionLevel: 'medium',
      satisfactionScore: 5,
      reasoning: 'Sin conversaciones registradas en la semana.',
      conversationSummary: 'No se registraron conversaciones con el cliente durante esta semana.',
      keyTopics: [],
    }
  }

  const userPrompt = buildSatisfactionPrompt(clientName, weekConversations, stats)

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
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

  return parseSatisfactionResponse(rawText)
}

/**
 * Parsea la respuesta JSON de Claude para el análisis de satisfacción.
 */
function parseSatisfactionResponse(raw: string): SatisfactionAnalysisResult {
  const defaultResult: SatisfactionAnalysisResult = {
    satisfactionLevel: 'medium',
    satisfactionScore: 5,
    reasoning: 'No fue posible analizar la conversación correctamente.',
    conversationSummary: 'Error al procesar el resumen de la semana.',
    keyTopics: [],
  }

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return defaultResult

    const parsed = JSON.parse(jsonMatch[0]) as Partial<SatisfactionAnalysisResult>

    const level = parsed.satisfactionLevel
    if (level !== 'high' && level !== 'medium' && level !== 'low') {
      return defaultResult
    }

    const score = Number(parsed.satisfactionScore)
    const validScore = !isNaN(score) && score >= 1 && score <= 10 ? score : 5

    return {
      satisfactionLevel: level,
      satisfactionScore: validScore,
      reasoning: typeof parsed.reasoning === 'string'
        ? parsed.reasoning.trim()
        : defaultResult.reasoning,
      conversationSummary: typeof parsed.conversationSummary === 'string'
        ? parsed.conversationSummary.trim().slice(0, 1000)
        : defaultResult.conversationSummary,
      keyTopics: Array.isArray(parsed.keyTopics)
        ? parsed.keyTopics.filter((t): t is string => typeof t === 'string').slice(0, 10)
        : [],
    }
  } catch (error) {
    console.error('[AI] Error parseando respuesta de satisfacción:', error)
    console.error('[AI] Respuesta raw:', raw.slice(0, 500))
    return defaultResult
  }
}
