import type { ReactNode } from 'react'
import { Navigate, useLocation, type Location } from 'react-router-dom'
import { postLoginPath } from '../services/authPaths'
import { sessionStore } from '../services/sessionStore'

function RequireGuest({ children }: { children: ReactNode }) {
  const user = sessionStore((state) => state.user)
  const location = useLocation()

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname
    return <Navigate to={postLoginPath(user, from)} replace />
  }

  return children
}

export default RequireGuest
