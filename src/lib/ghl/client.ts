/**
 * GHL API v2 — Cliente base
 *
 * Todas las llamadas a GoHighLevel pasan por aquí.
 * Base URL: https://services.leadconnectorhq.com
 * Auth: Bearer token via GHL_API_KEY
 * Version header: 2021-07-28
 */

const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

export class GHLError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string
  ) {
    super(message)
    this.name = 'GHLError'
  }
}

interface GHLRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(`${GHL_BASE_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
  }
  return url.toString()
}

export async function ghlFetch<T>(
  path: string,
  options: GHLRequestOptions = {}
): Promise<T> {
  const apiKey = process.env.GHL_API_KEY
  if (!apiKey) {
    throw new Error('GHL_API_KEY no está configurada')
  }

  const { method = 'GET', body, params } = options
  const url = buildUrl(path, params)

  const headers: HeadersInit = {
    Authorization: `Bearer ${apiKey}`,
    Version: GHL_API_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
    // No cachear en el edge — los datos de GHL son tiempo real
    cache: 'no-store',
  }

  const response = await fetch(url, fetchOptions)

  if (!response.ok) {
    let errorMessage = `GHL API error ${response.status}`
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.message ?? errorBody.msg ?? errorMessage
    } catch {
      // ignore JSON parse errors
    }
    throw new GHLError(errorMessage, response.status, path)
  }

  // Algunos endpoints de GHL retornan 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}
