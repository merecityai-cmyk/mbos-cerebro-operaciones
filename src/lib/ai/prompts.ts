/**
 * Prompts centralizados para Claude.
 * Todos los prompts del sistema viven aquí — nunca inline en los jobs.
 */

/**
 * Prompt de extracción de tareas desde una conversación.
 * offerContext: descripción textual de los servicios activos del cliente (opcional).
 */
export function buildTaskExtractionPrompt(
  clientName: string,
  conversation: string,
  offerContext?: string | null
): string {
  const offerSection = offerContext
    ? `\nSERVICIOS CONTRATADOS POR ${clientName.toUpperCase()}:\n${offerContext}\n`
    : ''

  return `Eres un asistente especializado en gestión de agencias de marketing digital.
Analiza la siguiente conversación entre el equipo de Johan Pérez NEX y el cliente ${clientName}.
${offerSection}
Extrae TODAS las tareas pendientes que el cliente solicitó o que quedaron comprometidas por el equipo.
Para cada tarea identifica:
1. Título corto (máx 80 caracteres) — específico y accionable
2. Descripción completa con contexto relevante de la conversación
3. Fecha límite si se mencionó (formato YYYY-MM-DD). Si no se mencionó, usa null.
4. Tipo de tarea — DEBE ser uno de: edicion_video, redes_contenido, agendamiento, whatsapp_sistema, pauta_ads, cobro_factura

Responde ÚNICAMENTE con un JSON válido con este formato exacto:
{
  "tasks": [
    {
      "title": "título corto aquí",
      "description": "descripción completa con contexto",
      "dueDate": "YYYY-MM-DD o null",
      "taskType": "edicion_video|redes_contenido|agendamiento|whatsapp_sistema|pauta_ads|cobro_factura"
    }
  ]
}

Si no hay tareas pendientes claras, responde: { "tasks": [] }

No incluyas explicaciones fuera del JSON. No uses markdown. Solo JSON puro.

CONVERSACIÓN:
${conversation}`
}

/**
 * Prompt de análisis de satisfacción semanal.
 */
export function buildSatisfactionPrompt(
  clientName: string,
  conversation: string,
  stats: {
    tasksTotal: number
    tasksCompleted: number
    tasksOverdue: number
    tasksPending: number
  }
): string {
  const completionRate =
    stats.tasksTotal > 0
      ? Math.round((stats.tasksCompleted / stats.tasksTotal) * 100)
      : 0

  return `Analiza las conversaciones de la semana entre Johan Pérez NEX y el cliente ${clientName}.

MÉTRICAS DE LA SEMANA:
- Tareas creadas: ${stats.tasksTotal}
- Tareas completadas: ${stats.tasksCompleted} (${completionRate}%)
- Tareas vencidas: ${stats.tasksOverdue}
- Tareas pendientes: ${stats.tasksPending}

Evalúa el nivel de satisfacción del cliente basándote en:
1. Tono del cliente en la conversación (positivo, neutral, negativo, urgente, frustrado)
2. Cumplimiento de compromisos: tareas completadas vs. prometidas
3. Velocidad de respuesta percibida (si el cliente menciona demoras o urgencias)
4. Calidad del servicio de marketing percibida (calidad del contenido, resultados de pauta, entregas)

Criterios de nivel:
- "high" (7-10): Cliente satisfecho, tono positivo, buena tasa de cumplimiento
- "medium" (4-6): Cliente neutral o con alguna queja menor, cumplimiento parcial
- "low" (1-3): Cliente frustrado, múltiples quejas, tareas vencidas sin atender

Responde ÚNICAMENTE con JSON válido:
{
  "satisfactionLevel": "high" | "medium" | "low",
  "satisfactionScore": número entre 1 y 10,
  "reasoning": "explicación en español de 2-3 oraciones",
  "conversationSummary": "resumen de los temas discutidos en la semana (máx 200 palabras)",
  "keyTopics": ["tema1", "tema2", "tema3"]
}

No incluyas explicaciones fuera del JSON. No uses markdown. Solo JSON puro.

CONVERSACIONES DE LA SEMANA:
${conversation}`
}
