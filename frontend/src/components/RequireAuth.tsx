import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { sessionStore } from '../services/sessionStore'

function RequireAuth({ children }: { children: ReactNode }) {
  const user = sessionStore((state) => state.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default RequireAuth
