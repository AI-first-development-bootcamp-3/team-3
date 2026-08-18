import { request } from './apiClient'

export type BackendRole = 'ADMIN' | 'EMPLOYEE'

export interface CreateUserRequest {
  email: string
  displayName: string
  role: BackendRole
  temporaryPassword?: string
}

export interface CreateUserResponse {
  user: {
    id: string
    email: string
    displayName: string
    role: BackendRole
    isActive: boolean
    mustChangePassword: boolean
  }
  temporaryPassword: string
}

export interface AdminUser {
  id: string
  email: string
  displayName: string
  role: BackendRole
  isActive: boolean
  mustChangePassword: boolean
}

export async function listUsers(): Promise<AdminUser[]> {
  const { users } = await request<{ users: AdminUser[] }>('/admin/users')
  return users
}

export async function createUser(input: CreateUserRequest): Promise<CreateUserResponse> {
  return request<CreateUserResponse>('/admin/users', { method: 'POST', body: input })
}
