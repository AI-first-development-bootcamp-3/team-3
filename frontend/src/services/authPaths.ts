import type { User } from '../types'

export const ADMIN_HOME_PATH = '/admin/assignments'

export function homePath(user: User | null | undefined): string {
  return user?.userType === 'admin' ? ADMIN_HOME_PATH : '/'
}

export function postLoginPath(user: User, fromPathname?: string): string {
  if (user.userType === 'admin') return ADMIN_HOME_PATH

  const from = fromPathname && fromPathname !== '/login' ? fromPathname : undefined
  if (!from || from.startsWith('/admin')) return '/'
  return from
}
