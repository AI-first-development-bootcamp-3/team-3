import type { ReactNode } from 'react'
import { sessionStore } from '../services/sessionStore'
import type { UserType } from '../types'

function RequireRole({
  role,
  children,
}: {
  role: UserType
  children: ReactNode
}) {
  const user = sessionStore((state) => state.user)

  if (user?.userType !== role) {
    return <div>Forbidden - {role} role required.</div>
  }

  return children
}

export default RequireRole
