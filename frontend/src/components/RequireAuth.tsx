import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { sessionStore } from '../services/sessionStore'

function RequireAuth({ children }: { children: ReactNode }) {
  const token = sessionStore((state) => state.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default RequireAuth
