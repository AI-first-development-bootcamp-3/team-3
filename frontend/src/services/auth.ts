import { request } from './apiClient'
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

export async function changeOwnPassword(newPassword: string): Promise<User> {
  const backendUser = await request<BackendUser>('/me/password', {
    method: 'PATCH',
    body: { newPassword },
  })
  return toUser(backendUser)
}
