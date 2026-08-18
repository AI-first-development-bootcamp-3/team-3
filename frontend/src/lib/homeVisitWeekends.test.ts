import { describe, expect, it } from 'vitest'
import { rememberVisitWeekends } from './homeVisitWeekends'

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial))
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key)
    },
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

describe('rememberVisitWeekends', () => {
  it('on a first visit, records Fridays and Saturdays from the 1st of that month through today', () => {
    const storage = memoryStorage()
    const days = rememberVisitWeekends('u1', '2026-08-17', storage)
    expect(days).toEqual(['2026-08-01', '2026-08-07', '2026-08-08', '2026-08-14', '2026-08-15'])
  })

  it('on a later visit, only appends weekends that happened after the last visit', () => {
    const storage = memoryStorage()
    rememberVisitWeekends('u1', '2026-08-13', storage)
    const days = rememberVisitWeekends('u1', '2026-08-17', storage)
    expect(days).toContain('2026-08-14')
    expect(days).toContain('2026-08-15')
    expect(days).not.toContain('2026-08-21')
  })
})
