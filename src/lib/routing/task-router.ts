import { db } from '@/lib/db'
import { taskRoutingRules, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { DEFAULT_RULES } from './routing-rules'

interface RoutingContext {
  taskTitle: string
  taskDescription: string
  taskType?: string
  clientAssignedAdvisorId: string // fallback si no hay match
}

interface RoutingResult {
  userId: string
  advisorName: string
  matchedKeyword: string | null
  source: 'db_rule' | 'default_rule' | 'client_advisor'
}

/**
 * Determina qué asesora debe recibir una tarea.
 *
 * Orden de prioridad:
 * 1. Reglas de la DB (tabla task_routing_rules, ordenadas por priority DESC)
 * 2. DEFAULT_RULES hardcodeadas en routing-rules.ts
 * 3. Asesor asignado al cliente (assignedAdvisorId)
 */
export async function routeTask(context: RoutingContext): Promise<RoutingResult> {
  const searchText = buildSearchText(context)

  // 1. Intentar con reglas de la DB
  const dbResult = await tryDBRules(searchText)
  if (dbResult) return dbResult

  // 2. Intentar con reglas por defecto
  const defaultResult = await tryDefaultRules(searchText)
  if (defaultResult) return defaultResult

  // 3. Fallback: asesor del cliente
  return {
    userId: context.clientAssignedAdvisorId,
    advisorName: 'Asesor del cliente',
    matchedKeyword: null,
    source: 'client_advisor',
  }
}

/**
 * Construye el texto en el que se buscan las keywords.
 * Combina título + descripción + tipo de tarea, todo en minúsculas y sin tildes.
 */
function buildSearchText(context: RoutingContext): string {
  const parts = [
    context.taskTitle,
    context.taskDescription,
    context.taskType ?? '',
  ]
  return normalize(parts.join(' '))
}

/**
 * Normaliza texto: minúsculas + elimina tildes para comparación robusta.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // elimina diacríticos
}

/**
 * Busca coincidencias en la tabla task_routing_rules de la DB.
 * Retorna el primer match (mayor priority).
 */
async function tryDBRules(normalizedText: string): Promise<RoutingResult | null> {
  const rules = await db
    .select({
      keyword: taskRoutingRules.keyword,
      priority: taskRoutingRules.priority,
      userId: taskRoutingRules.assignedToId,
      userName: users.name,
    })
    .from(taskRoutingRules)
    .innerJoin(users, eq(taskRoutingRules.assignedToId, users.id))
    .orderBy(desc(taskRoutingRules.priority))

  for (const rule of rules) {
    if (normalizedText.includes(normalize(rule.keyword))) {
      return {
        userId: rule.userId,
        advisorName: rule.userName,
        matchedKeyword: rule.keyword,
        source: 'db_rule',
      }
    }
  }

  return null
}

/**
 * Busca coincidencias en DEFAULT_RULES.
 * Retorna el primer match encontrado.
 */
async function tryDefaultRules(normalizedText: string): Promise<RoutingResult | null> {
  for (const rule of DEFAULT_RULES) {
    const matchedKeyword = rule.keywords.find((kw) =>
      normalizedText.includes(normalize(kw))
    )

    if (matchedKeyword) {
      // Buscar el userId del asesor por nombre en la DB
      const [advisor] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.name, rule.advisorName))
        .limit(1)

      if (advisor) {
        return {
          userId: advisor.id,
          advisorName: advisor.name,
          matchedKeyword,
          source: 'default_rule',
        }
      }
    }
  }

  return null
}

/**
 * Versión sin DB para testing y para el job cron cuando se pre-cargan los usuarios.
 * Recibe un mapa de nombre → userId para evitar queries adicionales.
 */
export function routeTaskSync(
  context: RoutingContext,
  usersByName: Record<string, string> // nombre → userId
): RoutingResult {
  const searchText = buildSearchText(context)

  for (const rule of DEFAULT_RULES) {
    const matchedKeyword = rule.keywords.find((kw) =>
      searchText.includes(normalize(kw))
    )

    if (matchedKeyword) {
      const userId = usersByName[rule.advisorName]
      if (userId) {
        return {
          userId,
          advisorName: rule.advisorName,
          matchedKeyword,
          source: 'default_rule',
        }
      }
    }
  }

  return {
    userId: context.clientAssignedAdvisorId,
    advisorName: 'Asesor del cliente',
    matchedKeyword: null,
    source: 'client_advisor',
  }
}
