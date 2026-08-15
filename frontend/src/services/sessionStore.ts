import { create } from 'zustand'
import type { User } from '../types'

interface SessionState {
  user: User | null
  token: string | null
  setSession: (user: User, token: string) => void
  clearSession: () => void
}

/**
 * Zustand, not React Context - apiClient.ts is a plain module and needs to
 * read the token outside React via getState(). See SCRUM-39's design.md.
 */
export const sessionStore = create<SessionState>((set) => ({
  user: null,
  token: null,
  setSession: (user, token) => set({ user, token }),
  clearSession: () => set({ user: null, token: null }),
}))
