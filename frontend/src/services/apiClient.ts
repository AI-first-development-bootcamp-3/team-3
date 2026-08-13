import { notification } from 'antd'
import { API_URL } from './env'
import { sessionStore } from './sessionStore'
import { redirectToLogin } from './navigation'

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
 * Core API fetch wrapper for making network requests.
 * 
 * **ERROR HANDLING PATTERN:**
 * Feature work should use this `request` function (or React Query hooks that use it) 
 * without worrying about global errors:
 * - **401 Unauthorized**: Handled automatically. The session is cleared, a toast is shown, and the user is redirected to `/login`.
 * - **500+ Server Errors**: Handled automatically via React Query's global cache. A toast is shown.
 * - **400/422 Validation Errors**: NOT handled automatically. Your feature code should catch these (via `try/catch` or `onError` in mutations) to show inline form validation messages.
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
    if (response.status === 401) {
      sessionStore.getState().clearSession()
      notification.warning({
        message: 'Session Expired',
        description: 'Session expired, please log in again',
      })
      redirectToLogin()
    }
    throw new ApiError(response.status, responseBody)
  }

  return responseBody as T
}
