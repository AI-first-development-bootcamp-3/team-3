import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
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
    return <Navigate to="/" replace />
  }

  return children
}

export default RequireRole
