import { useEffect } from 'react'
import { getMe } from '../services/auth'
import { sessionStore } from '../services/sessionStore'

const POLL_MS = 15_000

/** Re-checks the cookie session so a deactivated account is kicked without waiting for the next click. */
function SessionGuard() {
  const user = sessionStore((state) => state.user)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    const ping = () => {
      void getMe()
        .then((fresh) => {
          if (!cancelled) sessionStore.getState().updateUser(fresh)
        })
        .catch(() => {
          /* 401 handler already clears the session */
        })
    }

    ping()
    const id = window.setInterval(ping, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user?.id])

  return null
}

export default SessionGuard
