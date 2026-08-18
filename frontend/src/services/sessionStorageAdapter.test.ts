import { describe, expect, it, vi } from 'vitest'
import { readSession, removeSession, writeSession, type StoredSession } from './sessionStorageAdapter'

const sample: StoredSession = { user: { id: '1' }, expiresAt: '2026-09-01T00:00:00.000Z' }

describe('sessionStorageAdapter', () => {
  it('round-trips a write then read', () => {
    writeSession(sessionStorage, sample)
    expect(readSession(sessionStorage)).toEqual(sample)
  })

  it('removes the stored session', () => {
    writeSession(sessionStorage, sample)
    removeSession(sessionStorage)
    expect(readSession(sessionStorage)).toBeNull()
  })

  it('returns null for malformed JSON instead of throwing', () => {
    sessionStorage.setItem('abra.session', 'not-json{')
    expect(readSession(sessionStorage)).toBeNull()
  })

  it('silently handles a storage that throws on access', () => {
    const throwingStorage = {
      getItem: vi.fn(() => {
        throw new Error('access denied')
      }),
      setItem: vi.fn(() => {
        throw new Error('access denied')
      }),
      removeItem: vi.fn(() => {
        throw new Error('access denied')
      }),
    } as unknown as Storage

    expect(() => writeSession(throwingStorage, sample)).not.toThrow()
    expect(readSession(throwingStorage)).toBeNull()
    expect(() => removeSession(throwingStorage)).not.toThrow()
  })
})
