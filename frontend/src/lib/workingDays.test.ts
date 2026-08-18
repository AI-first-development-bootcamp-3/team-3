import { describe, expect, it } from 'vitest'
import { countWorkingDays, weekendDatesInclusive } from './workingDays'

describe('countWorkingDays', () => {
  it('excludes Friday and Saturday from a full week', () => {
    expect(countWorkingDays('2026-01-04', '2026-01-10')).toBe(5)
  })

  it('returns zero for Friday and Saturday only', () => {
    expect(countWorkingDays('2026-01-09', '2026-01-10')).toBe(0)
  })

  it('returns one for a Sunday', () => {
    expect(countWorkingDays('2026-01-04', '2026-01-04')).toBe(1)
  })

  it('returns zero for a Saturday', () => {
    expect(countWorkingDays('2026-01-10', '2026-01-10')).toBe(0)
  })

  it('crosses a month boundary', () => {
    expect(countWorkingDays('2026-01-28', '2026-02-03')).toBe(5)
  })

  it('crosses a year boundary', () => {
    expect(countWorkingDays('2025-12-29', '2026-01-02')).toBe(4)
  })
})

describe('weekendDatesInclusive', () => {
  it('returns Friday and Saturday only', () => {
    expect(weekendDatesInclusive('2026-08-13', '2026-08-16')).toEqual(['2026-08-14', '2026-08-15'])
  })
})
