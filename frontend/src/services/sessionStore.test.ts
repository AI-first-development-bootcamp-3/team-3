import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { notification } from 'antd'
import { sessionStore } from './sessionStore'
import * as navigation from './navigation'
import type { User } from '../types'

const user: User = { id: '1', fullName: 'Admin', email: 'admin@abra.test', userType: 'admin', active: true }
const future = new Date(Date.now() + 60_000).toISOString()
const past = new Date(Date.now() - 60_000).toISOString()

describe('sessionStore', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
    sessionStore.getState().clearSession()
  })

  afterEach(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
    sessionStore.getState().clearSession()
  })

  it('persists to localStorage regardless of rememberMe, so any open tab can see it', () => {
    sessionStore.getState().setSession(user, 'token-a', future, false)
    expect(window.localStorage.getItem('abra.session')).not.toBeNull()
    expect(window.sessionStorage.getItem('abra.session')).toBeNull()
  })

  it('persists to localStorage when remembered', () => {
    sessionStore.getState().setSession(user, 'token-a', future, true)
    expect(window.localStorage.getItem('abra.session')).not.toBeNull()
    expect(window.sessionStorage.getItem('abra.session')).toBeNull()
  })

  it('clearSession removes the entry from both storages', () => {
    sessionStore.getState().setSession(user, 'token-a', future, true)
    sessionStore.getState().clearSession()
    expect(window.sessionStorage.getItem('abra.session')).toBeNull()
    expect(window.localStorage.getItem('abra.session')).toBeNull()
    expect(sessionStore.getState().token).toBeNull()
  })

  it('rehydrateSession restores a valid stored session', () => {
    sessionStore.getState().setSession(user, 'token-a', future, true)
    sessionStore.setState({ user: null, token: null })

    sessionStore.getState().rehydrateSession()

    expect(sessionStore.getState().token).toBe('token-a')
    expect(sessionStore.getState().user).toEqual(user)
  })

  it('rehydrateSession discards an expired session', () => {
    window.localStorage.setItem('abra.session', JSON.stringify({ user, token: 'token-a', expiresAt: past }))

    sessionStore.getState().rehydrateSession()

    expect(sessionStore.getState().token).toBeNull()
  })

  it('rehydrateSession discards a malformed session', () => {
    window.localStorage.setItem('abra.session', JSON.stringify({ user, expiresAt: future }))

    sessionStore.getState().rehydrateSession()

    expect(sessionStore.getState().token).toBeNull()
  })

  it('clearSession leaves no persisted copy in either storage for a remembered session', () => {
    sessionStore.getState().setSession(user, 'token-a', future, true)
    sessionStore.getState().clearSession()
    expect(window.localStorage.getItem('abra.session')).toBeNull()
    expect(window.sessionStorage.getItem('abra.session')).toBeNull()
  })

  it('clearSession leaves no persisted copy in either storage for a non-remembered session', () => {
    sessionStore.getState().setSession(user, 'token-a', future, false)
    sessionStore.getState().clearSession()
    expect(window.localStorage.getItem('abra.session')).toBeNull()
    expect(window.sessionStorage.getItem('abra.session')).toBeNull()
  })
})

describe('sessionStore expiry timer', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
    sessionStore.getState().clearSession()
  })

  afterEach(() => {
    // clearSession while real timers are active cancels any pending fake-timer
    // based expiry timeout before we tear the fake timers down, so a leftover
    // callback can't fire against a later test's module state.
    sessionStore.getState().clearSession()
    vi.useRealTimers()
    vi.restoreAllMocks()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('ends the session on its own once the token expires, with no user interaction', () => {
    vi.useFakeTimers()
    const notifySpy = vi.spyOn(notification, 'warning').mockImplementation(() => '' as unknown as void)
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})

    sessionStore.getState().setSession(user, 'token-a', new Date(Date.now() + 5000).toISOString(), false)
    expect(sessionStore.getState().token).toBe('token-a')

    vi.advanceTimersByTime(5001)

    expect(sessionStore.getState().token).toBeNull()
    expect(window.sessionStorage.getItem('abra.session')).toBeNull()
    expect(notifySpy).toHaveBeenCalledOnce()
    expect(notifySpy).toHaveBeenCalledWith({ message: 'החיבור פג ונותק', description: 'יש להתחבר שוב' })
    expect(redirectSpy).toHaveBeenCalledOnce()
  })

  it('does not end the session before its expiry passes', () => {
    vi.useFakeTimers()
    vi.spyOn(notification, 'warning').mockImplementation(() => '' as unknown as void)
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})

    sessionStore.getState().setSession(user, 'token-a', new Date(Date.now() + 5000).toISOString(), false)
    vi.advanceTimersByTime(4000)

    expect(sessionStore.getState().token).toBe('token-a')
    expect(redirectSpy).not.toHaveBeenCalled()
  })

  it('clearSession cancels a pending timer so a stale timer cannot end a later, different session', () => {
    vi.useFakeTimers()
    const notifySpy = vi.spyOn(notification, 'warning').mockImplementation(() => '' as unknown as void)
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})

    sessionStore.getState().setSession(user, 'token-a', new Date(Date.now() + 5000).toISOString(), false)
    sessionStore.getState().clearSession()

    // A different, later session begins before the first timer would have fired.
    sessionStore.getState().setSession(user, 'token-b', new Date(Date.now() + 20_000).toISOString(), false)

    // Past the first session's would-be expiry, well short of the second's.
    vi.advanceTimersByTime(6000)

    expect(sessionStore.getState().token).toBe('token-b')
    expect(notifySpy).not.toHaveBeenCalled()
    expect(redirectSpy).not.toHaveBeenCalled()
  })

  it('does not arm a timer or expire the session when expiresAt is missing/malformed (fails open)', () => {
    vi.useFakeTimers()
    const notifySpy = vi.spyOn(notification, 'warning').mockImplementation(() => '' as unknown as void)
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})

    // new Date('not-a-date').getTime() is NaN, so a naive `delay <= 0` guard
    // is skipped and setTimeout(fn, NaN) fires on the very next tick.
    sessionStore.getState().setSession(user, 'token-a', 'not-a-date', false)

    vi.advanceTimersByTime(0)

    expect(sessionStore.getState().token).toBe('token-a')
    expect(notifySpy).not.toHaveBeenCalled()
    expect(redirectSpy).not.toHaveBeenCalled()
  })

  it('re-arms in chunks for a ~30 day remember-me delay instead of overflowing setTimeout and firing immediately', () => {
    vi.useFakeTimers()
    const notifySpy = vi.spyOn(notification, 'warning').mockImplementation(() => '' as unknown as void)
    vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000 // overflows setTimeout's 32-bit signed delay
    sessionStore.getState().setSession(user, 'token-a', new Date(Date.now() + THIRTY_DAYS_MS).toISOString(), true)

    // A naive setTimeout(delay) with this delay overflows and fires immediately
    // in Node/browsers. Advancing a little should NOT end the session.
    vi.advanceTimersByTime(1000)
    expect(sessionStore.getState().token).toBe('token-a')
    expect(notifySpy).not.toHaveBeenCalled()

    // Advancing through the remainder of the real delay should still end it.
    vi.advanceTimersByTime(THIRTY_DAYS_MS)
    expect(sessionStore.getState().token).toBeNull()
    expect(notifySpy).toHaveBeenCalledOnce()
  })
})

/**
 * jsdom's StorageEvent constructor webidl-validates `storageArea` against its
 * *own* branded Storage instances. test-setup.ts polyfills `window.localStorage`
 * with a plain in-memory Storage (Node's experimental global `localStorage`
 * shadows jsdom's real one), so that polyfill is never accepted by the
 * constructor. Build the event without `storageArea` and attach it after
 * construction to get a real event whose `storageArea` is our
 * `window.localStorage`, matching what the implementation compares against.
 */
function dispatchSessionStorageEvent(newValue: string | null, key = 'abra.session'): void {
  const event = new StorageEvent('storage', { key, newValue })
  Object.defineProperty(event, 'storageArea', { value: window.localStorage })
  window.dispatchEvent(event)
}

describe('sessionStore cross-tab sync via storage events', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
    sessionStore.getState().clearSession()
  })

  afterEach(() => {
    sessionStore.getState().clearSession()
    vi.restoreAllMocks()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('ends this tab\'s session when the abra.session key is removed from localStorage in another tab', () => {
    const notifySpy = vi.spyOn(notification, 'warning').mockImplementation(() => '' as unknown as void)
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})
    sessionStore.getState().setSession(user, 'token-a', future, true)

    dispatchSessionStorageEvent(null)

    expect(sessionStore.getState().token).toBeNull()
    expect(notifySpy).toHaveBeenCalledOnce()
    expect(redirectSpy).toHaveBeenCalledOnce()
  })

  it('shows the "disconnected" copy, distinct from timer expiry, for a cross-tab wake', () => {
    const notifySpy = vi.spyOn(notification, 'warning').mockImplementation(() => '' as unknown as void)
    vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})
    sessionStore.getState().setSession(user, 'token-a', future, true)

    dispatchSessionStorageEvent(null)

    expect(notifySpy).toHaveBeenCalledWith({ message: 'החיבור נותק', description: 'התנתקת מהמערכת' })
  })

  it('ignores a write to the abra.session key (a login in another tab must not log out a healthy tab)', () => {
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})
    sessionStore.getState().setSession(user, 'token-a', future, true)

    dispatchSessionStorageEvent(JSON.stringify({ user, token: 'token-from-other-tab', expiresAt: future }))

    expect(sessionStore.getState().token).toBe('token-a')
    expect(redirectSpy).not.toHaveBeenCalled()
  })

  it('ignores a removal event for an unrelated key', () => {
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})
    sessionStore.getState().setSession(user, 'token-a', future, true)

    dispatchSessionStorageEvent(null, 'some.other.key')

    expect(sessionStore.getState().token).toBe('token-a')
    expect(redirectSpy).not.toHaveBeenCalled()
  })
})
