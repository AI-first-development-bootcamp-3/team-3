import { describe, expect, it } from 'vitest'
import {
  addOneMinute,
  attendanceTimesForSegment,
  clockErrorMessage,
  clockReportTimeFields,
  formatElapsed,
  segmentHours,
  totalSessionMinutes,
} from './workClock'

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

describe('addOneMinute', () => {
  it('advances a clock by one minute', () => {
    expect(addOneMinute('22:47')).toBe('22:48')
  })

  it('stays on the same calendar day at 23:59', () => {
    expect(addOneMinute('23:59')).toBe('23:59')
  })
})

describe('clockReportTimeFields', () => {
  const subMinute = { date: '2026-08-18', startTime: '22:47', endTime: '22:47', durationMinutes: 0 }
  const nineHours = { date: '2026-08-17', startTime: '09:00', endTime: '18:00', durationMinutes: 540 }

  it('sends hours and never a clock pair for a SUM_HOURS project', () => {
    expect(clockReportTimeFields(subMinute, 'SUM_HOURS')).toEqual({ hours: 0 })
    expect(clockReportTimeFields(nineHours, 'SUM_HOURS')).toEqual({ hours: 9 })
  })

  it('sends a clock pair and never hours for a CLOCK_IN_OUT project', () => {
    expect(clockReportTimeFields(nineHours, 'CLOCK_IN_OUT')).toEqual({
      rowStartTime: '09:00',
      rowEndTime: '18:00',
    })
  })

  it('bumps a same-minute CLOCK_IN_OUT stop so the pair is not zero-length', () => {
    expect(attendanceTimesForSegment(subMinute)).toEqual({ startTime: '22:47', endTime: '22:48' })
    expect(clockReportTimeFields(subMinute, 'CLOCK_IN_OUT')).toEqual({
      rowStartTime: '22:47',
      rowEndTime: '22:48',
    })
  })
})
