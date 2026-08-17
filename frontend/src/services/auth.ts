import { request } from './apiClient'
import { sessionStore } from './sessionStore'
import { queryClient } from './queryClient'
import { redirectToLogin } from './navigation'
import type { User, UserType } from '../types'

/** Shape returned by the backend (`backend/src/services/auth.service.ts` PublicUser). */
interface BackendUser {
  id: string
  email: string
  displayName: string
  role: 'ADMIN' | 'EMPLOYEE'
  mustChangePassword: boolean
}

interface LoginResponse {
  token: string
  expiresAt: string
  user: BackendUser
}

const ROLE_TO_USER_TYPE: Record<BackendUser['role'], UserType> = {
  ADMIN: 'admin',
  EMPLOYEE: 'regular',
}

function toUser(backendUser: BackendUser): User {
  return {
    id: backendUser.id,
    fullName: backendUser.displayName,
    email: backendUser.email,
    userType: ROLE_TO_USER_TYPE[backendUser.role],
    active: true,
    mustChangePassword: backendUser.mustChangePassword,
  }
}

export async function login(
  email: string,
  password: string,
  rememberMe: boolean,
): Promise<{ user: User; token: string; expiresAt: string }> {
  const response = await request<LoginResponse>('/login', {
    method: 'POST',
    body: { email, password, rememberMe },
    handleUnauthorizedGlobally: false,
  })
  return { user: toUser(response.user), token: response.token, expiresAt: response.expiresAt }
}

/** Best-effort server notification that the session is ending. Called with
 * `handleUnauthorizedGlobally: false` because a 401 here just means the
 * token was already revoked (e.g. by another tab) - that must not trigger
 * apiClient's global "Session Expired" toast on top of a deliberate logout
 * (D8). */
export async function logout(): Promise<void> {
  await request<void>('/logout', {
    method: 'POST',
    handleUnauthorizedGlobally: false,
  })
}

/**
 * The full logout flow (D8): the server call is best-effort, but local
 * teardown is not conditional on it succeeding - a user on a shared machine
 * who loses their network must still end up logged out. Teardown runs in
 * `finally` so it happens whether `logout()` resolves or rejects.
 *
 * `queryClient.clear()` matters, not just `clearSession()`: the cache is a
 * module-level singleton, so without clearing it the next person to log in
 * on this browser could be served the previous user's cached data before
 * their own first fetch completes.
 */
export async function logoutAndRedirect(): Promise<void> {
  try {
    await logout()
  } catch {
    // Swallowed deliberately: the only thing lost is server-side revocation
    // of a token the client is about to forget entirely. If it was never
    // revoked, it still expires on its own schedule - the pre-change status quo.
  } finally {
    sessionStore.getState().clearSession()
    queryClient.clear()
    redirectToLogin() // no `from` state preserved - see frontend-logout spec
  }
}

export async function changeOwnPassword(newPassword: string): Promise<User> {
  const backendUser = await request<BackendUser>('/me/password', {
    method: 'PATCH',
    body: { newPassword },
  })
  return toUser(backendUser)
}
