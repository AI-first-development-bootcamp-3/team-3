import { create } from 'zustand'
import type { User } from '../types'
import { removeSession, writeSession } from './sessionStorageAdapter'

interface SessionState {
  user: User | null
  token: string | null
  setSession: (user: User, token: string, expiresAt: string, rememberMe: boolean) => void
  clearSession: () => void
}

/**
 * Zustand, not React Context - apiClient.ts is a plain module and needs to
 * read the token outside React via getState(). See SCRUM-39's design.md.
 */
export const sessionStore = create<SessionState>((set) => ({
  user: null,
  token: null,
  setSession: (user, token, expiresAt, rememberMe) => {
    writeSession(rememberMe ? localStorage : sessionStorage, { user, token, expiresAt })
    set({ user, token })
  },
  clearSession: () => {
    removeSession(sessionStorage)
    removeSession(localStorage)
    set({ user: null, token: null })
  },
}))
