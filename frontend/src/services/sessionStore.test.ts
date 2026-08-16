import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sessionStore } from './sessionStore'
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

  it('persists to sessionStorage when not remembered', () => {
    sessionStore.getState().setSession(user, 'token-a', future, false)
    expect(window.sessionStorage.getItem('abra.session')).not.toBeNull()
    expect(window.localStorage.getItem('abra.session')).toBeNull()
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
    window.sessionStorage.setItem('abra.session', JSON.stringify({ user, token: 'token-a', expiresAt: past }))

    sessionStore.getState().rehydrateSession()

    expect(sessionStore.getState().token).toBeNull()
  })

  it('rehydrateSession discards a malformed session', () => {
    window.sessionStorage.setItem('abra.session', JSON.stringify({ user, expiresAt: future }))

    sessionStore.getState().rehydrateSession()

    expect(sessionStore.getState().token).toBeNull()
  })

  it('rehydrateSession prefers sessionStorage when both hold an entry', () => {
    window.sessionStorage.setItem('abra.session', JSON.stringify({ user, token: 'from-session', expiresAt: future }))
    window.localStorage.setItem('abra.session', JSON.stringify({ user, token: 'from-local', expiresAt: future }))

    sessionStore.getState().rehydrateSession()

    expect(sessionStore.getState().token).toBe('from-session')
  })
})
