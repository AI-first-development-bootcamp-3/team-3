import type { User } from '../types'

export function homePath(user: User | null | undefined): string {
  return user?.userType === 'admin' ? '/admin' : '/'
}

export function postLoginPath(user: User, fromPathname?: string): string {
  if (user.userType === 'admin') return '/admin'

  const from = fromPathname && fromPathname !== '/login' ? fromPathname : undefined
  if (!from || from.startsWith('/admin')) return '/'
  return from
}
