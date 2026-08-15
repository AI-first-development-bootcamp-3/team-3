import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { sessionStore } from '../services/sessionStore'

function RequireAuth({ children }: { children: ReactNode }) {
  const token = sessionStore((state) => state.token)
  const user = sessionStore((state) => state.user)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // A forced password change (SCRUM-209) blocks every other protected route
  // until it's done, so it can't be dodged by navigating elsewhere directly.
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return children
}

export default RequireAuth
