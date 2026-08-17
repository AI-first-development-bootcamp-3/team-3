import { create } from 'zustand'
import { notification } from 'antd'
import type { User } from '../types'
import { readSession, removeSession, writeSession, SESSION_KEY, type StoredSession } from './sessionStorageAdapter'
import { redirectToLogin } from './navigation'

interface SessionState {
  user: User | null
  token: string | null
  setSession: (user: User, token: string, expiresAt: string, rememberMe: boolean) => void
  /** Updates the signed-in user in place (e.g. after a password change) without touching the token/expiry. */
  updateUser: (user: User) => void
  clearSession: () => void
  rehydrateSession: () => void
}

function isValidStoredSession(stored: StoredSession | null): stored is StoredSession {
  if (!stored || typeof stored.token !== 'string' || typeof stored.expiresAt !== 'string' || !stored.user) {
    return false
  }
  const expiresAt = new Date(stored.expiresAt).getTime()
  return !Number.isNaN(expiresAt) && expiresAt > Date.now()
}

/**
 * Zustand, not React Context - apiClient.ts is a plain module and needs to
 * read the token outside React via getState(). See SCRUM-39's design.md.
 */
export const sessionStore = create<SessionState>((set, get) => ({
  user: null,
  token: null,
  // rememberMe no longer selects the storage area (D-cross-tab: every
  // session lives in localStorage so any open tab can see it); the backend
  // still uses it to set a longer `expiresAt` for a remembered session. A
  // function implementing a wider type may drop trailing parameters it
  // doesn't need, so it's simply omitted here rather than left unused.
  setSession: (user, token, expiresAt) => {
    writeSession(window.localStorage, { user, token, expiresAt })
    set({ user, token })
    armExpiryTimer(expiresAt)
  },
  updateUser: (user) => {
    set({ user })
    const { token } = get()
    if (!token) return
    const stored = readSession(window.localStorage)
    if (stored) {
      writeSession(window.localStorage, { ...stored, user })
    }
  },
  clearSession: () => {
    removeSession(window.sessionStorage)
    removeSession(window.localStorage)
    set({ user: null, token: null })
    clearExpiryTimer()
  },
  rehydrateSession: () => {
    const stored = readSession(window.localStorage)
    if (!isValidStoredSession(stored)) return
    set({ user: stored.user as User, token: stored.token })
    armExpiryTimer(stored.expiresAt)
  },
}))

// ---------------------------------------------------------------------------
// Proactive expiry timer (D9)
//
// Module-level, not a React effect: rehydrateSession() runs in main.tsx
// before React mounts, and apiClient already reads this store from outside
// React, so a countdown owned by a component would miss the boot case and
// would re-arm on every remount. See also `8568644 fix: avoid
// setState-in-effect for the login lockout countdown` for the repo's stance
// on this shape of bug.
// ---------------------------------------------------------------------------

/** setTimeout takes a signed 32-bit millisecond delay. A 30-day remember-me
 * session (~2.6 billion ms) overflows that and Node/browsers fire the
 * timeout *immediately* rather than throwing - which would log a freshly
 * restored remembered session out at boot. Delays past this ceiling are
 * split into full-length chunks that just re-arm the timer with whatever
 * remains, until the final chunk is short enough to actually expire it. */
const MAX_TIMEOUT_DELAY_MS = 2_147_483_647

let expiryTimerId: ReturnType<typeof setTimeout> | null = null

function clearExpiryTimer(): void {
  if (expiryTimerId !== null) {
    clearTimeout(expiryTimerId)
    expiryTimerId = null
  }
}

function scheduleExpiryChunk(remainingMs: number): void {
  if (remainingMs > MAX_TIMEOUT_DELAY_MS) {
    expiryTimerId = setTimeout(() => scheduleExpiryChunk(remainingMs - MAX_TIMEOUT_DELAY_MS), MAX_TIMEOUT_DELAY_MS)
    return
  }
  expiryTimerId = setTimeout(expireSessionOnTimer, remainingMs)
}

/** Arm/re-arm the timer for a session's `expiresAt`. Called from both
 * `setSession` and `rehydrateSession` (D9) - those are the only two places a
 * session begins in this client. */
function armExpiryTimer(expiresAt: string): void {
  clearExpiryTimer()
  const delay = new Date(expiresAt).getTime() - Date.now()
  // A missing/malformed expiresAt makes `delay` NaN. `NaN <= 0` is false, so
  // without this guard the code would fall through to
  // scheduleExpiryChunk(NaN) -> setTimeout(fn, NaN), which browsers fire on
  // the very next tick - silently destroying a freshly established session.
  // Fail open instead: arm nothing and let apiClient's existing reactive 401
  // handling be the backstop. A single malformed field from the backend
  // should not turn into an instant, unrecoverable logout for every user.
  if (Number.isNaN(delay)) {
    return
  }
  if (delay <= 0) {
    expireSessionOnTimer()
    return
  }
  scheduleExpiryChunk(delay)
}

/** Shared teardown for every path that ends a session client-side outside an
 * explicit user-initiated logout: clear state, toast, redirect. The two
 * callers below differ only in which copy applies. */
function endSessionLocally(message: string, description: string): void {
  sessionStore.getState().clearSession()
  notification.warning({ message, description })
  redirectToLogin()
}

/** Fired when the token's own expiry passes while a tab is open. `apiClient`'s
 * reactive 401 handling stays in place as the backstop for client clock skew
 * (D9) - this is the proactive half. */
function expireSessionOnTimer(): void {
  endSessionLocally('החיבור פג ונותק', 'יש להתחבר שוב')
}

/** Fired by the cross-tab `storage` listener below for a session ended in
 * another tab (a deliberate logout or a server-side revocation there) - not
 * a timer-driven expiry, so it gets the "disconnected" copy rather than the
 * "expired" copy. */
function endSessionFromOtherTab(): void {
  endSessionLocally('החיבור נותק', 'התנתקת מהמערכת')
}

// ---------------------------------------------------------------------------
// Cross-tab sync (D10)
//
// clearSession() already removes SESSION_KEY from localStorage, and browsers
// fire a `storage` event in every *other* same-origin tab when that happens
// - no BroadcastChannel or message protocol needed. Only a removal
// (newValue === null) is a signal; a *write* (e.g. a login in another tab)
// must be ignored, or that login would log out an unrelated, healthy tab.
// sessionStorage sessions are per-tab by nature, so there is nothing to
// propagate for them - localStorage is the only case this can apply to.
// ---------------------------------------------------------------------------

function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== SESSION_KEY || event.newValue !== null) return
  if (event.storageArea !== window.localStorage) return
  // The session was ended elsewhere (logout or server-side revocation) -
  // it is already gone server-side, so this tab tears down locally and
  // redirects without calling POST /logout again.
  endSessionFromOtherTab()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', handleStorageEvent)
}
