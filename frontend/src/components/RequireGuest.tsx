import type { ReactNode } from 'react'
import { Navigate, useLocation, type Location } from 'react-router-dom'
import { sessionStore } from '../services/sessionStore'

function RequireGuest({ children }: { children: ReactNode }) {
  const token = sessionStore((state) => state.token)
  const user = sessionStore((state) => state.user)
  const location = useLocation()

  if (token) {
    // Mirrors Login.tsx's post-login navigate() target exactly, so this guard
    // and Login's own navigate() race to the same destination - see SCRUM-214.
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/'
    return <Navigate to={user?.mustChangePassword ? '/change-password' : from} replace />
  }

  return children
}

export default RequireGuest
