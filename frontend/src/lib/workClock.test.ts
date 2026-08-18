import { describe, expect, it } from 'vitest'
import { clockErrorMessage, formatElapsed, segmentHours, totalSessionMinutes } from './workClock'

describe('formatElapsed', () => {
  it('renders a live HH:MM:SS clock from milliseconds', () => {
    expect(formatElapsed(0)).toBe('00:00:00')
    expect(formatElapsed(12_000)).toBe('00:00:12')
    expect(formatElapsed(3_661_000)).toBe('01:01:01')
  })

  it('does not go negative', () => {
    expect(formatElapsed(-500)).toBe('00:00:00')
  })
})

describe('segmentHours', () => {
  it('maps a sub-minute session to zero hours', () => {
    expect(
      segmentHours({ date: '2026-08-18', startTime: '16:02', endTime: '16:02', durationMinutes: 0 }),
    ).toBe(0)
  })

  it('rounds a 54-minute segment to one decimal hour', () => {
    expect(
      segmentHours({ date: '2026-08-18', startTime: '09:00', endTime: '09:54', durationMinutes: 54 }),
    ).toBe(0.9)
  })
})

describe('totalSessionMinutes', () => {
  it('sums split segments', () => {
    expect(
      totalSessionMinutes([
        { date: '2026-08-17', startTime: '23:50', endTime: '23:59', durationMinutes: 9 },
        { date: '2026-08-18', startTime: '00:00', endTime: '00:10', durationMinutes: 10 },
      ]),
    ).toBe(19)
  })
})

describe('clockErrorMessage', () => {
  it('reads the API error message when present', () => {
    expect(clockErrorMessage({ error: { message: 'אין משימות מוקצות' } })).toBe('אין משימות מוקצות')
  })
})
