import { API_URL } from './env'
import { sessionStore } from './sessionStore'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(`API request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * Thin fetch wrapper every feature Story's services/ code goes through, instead
 * of calling fetch directly. Attaches the session token automatically (SCRUM-39)
 * when one is present. No error-redirect handling here - that's SCRUM-42.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options
  const { token } = sessionStore.getState()

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const contentType = response.headers.get('content-type')
  const responseBody = contentType?.includes('application/json')
    ? await response.json()
    : undefined

  if (!response.ok) {
    throw new ApiError(response.status, responseBody)
  }

  return responseBody as T
}
