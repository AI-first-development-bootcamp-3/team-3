import { request } from './apiClient'
import { sessionStore } from './sessionStore'
import { queryClient } from './queryClient'
import { redirectToLogin } from './navigation'
import { notification } from 'antd'
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
  expiresAt: string
  user: BackendUser
}

const ROLE_TO_USER_TYPE: Record<BackendUser['role'], UserType> = {
  ADMIN: 'admin',
  EMPLOYEE: 'regular',
}

export function toUser(backendUser: BackendUser): User {
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
): Promise<{ user: User; expiresAt: string }> {
  const response = await request<LoginResponse>('/login', {
    method: 'POST',
    body: { email, password, rememberMe },
    handleUnauthorizedGlobally: false,
  })
  return { user: toUser(response.user), expiresAt: response.expiresAt }
}

export async function getMe(): Promise<User> {
  const backendUser = await request<BackendUser>('/me')
  return toUser(backendUser)
}

export async function logout(): Promise<void> {
  await request<void>('/logout', {
    method: 'POST',
    handleUnauthorizedGlobally: false,
  })
}

export async function logoutAndRedirect(): Promise<void> {
  try {
    await logout()
  } catch {
    // Swallowed deliberately: local teardown still runs.
  } finally {
    sessionStore.getState().clearSession()
    queryClient.clear()
    notification.success({
      message: 'התנתקת בהצלחה',
      description: 'להתראות',
    })
    redirectToLogin()
  }
}

export async function changeOwnPassword(newPassword: string): Promise<User> {
  const backendUser = await request<BackendUser>('/me/password', {
    method: 'PATCH',
    body: { newPassword },
  })
  return toUser(backendUser)
}
