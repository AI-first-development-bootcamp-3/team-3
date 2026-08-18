export interface StoredSession {
  user: unknown
  expiresAt: string
}

/** Exported so sessionStore's cross-tab `storage` listener (D10) can match
 * the exact key it must react to without duplicating the literal. */
export const SESSION_KEY = 'abra.session'
export const LAST_EMAIL_KEY = 'abra.lastEmail'

/**
 * Wraps sessionStorage/localStorage access in try/catch: Safari private mode
 * and some hardened configurations throw on Storage access rather than
 * returning null, and that must degrade to a no-op, never break the app.
 */
export function readSession(storage: Storage): StoredSession | null {
  try {
    const raw = storage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

export function writeSession(storage: Storage, session: StoredSession): void {
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // no-op: storage unavailable or full
  }
}

export function removeSession(storage: Storage): void {
  try {
    storage.removeItem(SESSION_KEY)
  } catch {
    // no-op: storage unavailable
  }
}

export function readLastEmail(): string {
  try {
    return window.localStorage.getItem(LAST_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

export function writeLastEmail(email: string): void {
  try {
    window.localStorage.setItem(LAST_EMAIL_KEY, email)
  } catch {
    // no-op
  }
}
