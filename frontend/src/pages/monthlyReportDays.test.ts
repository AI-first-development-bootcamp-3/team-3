import { describe, expect, it } from 'vitest'
import { mapReportsToHomeDays, buildHomeDays } from './monthlyReportDays'
import type { TimeReportListItem } from '../types'

function row(overrides: Partial<TimeReportListItem>): TimeReportListItem {
  return {
    id: 'r1',
    userId: 'u1',
    clientId: 'c1',
    projectId: 'p1',
    taskId: 't1',
    date: '2026-08-17',
    workLocation: 'CLIENT',
    startTime: '09:00',
    endTime: '18:00',
    hours: 9,
    description: 'QA',
    clientName: 'Globex',
    projectName: 'Mobile',
    taskName: 'QA',
    durationHours: 9,
    ...overrides,
  }
}

describe('mapReportsToHomeDays', () => {
  it('groups rows by date and marks a filled nine-hour window as 9 שעות', () => {
    const days = mapReportsToHomeDays([
      row({ id: 'r1', projectId: 'p1', hours: 4, durationHours: 4 }),
      row({ id: 'r2', projectId: 'p2', hours: 5, durationHours: 5 }),
    ])

    expect(days).toHaveLength(1)
    expect(days[0]?.status).toBe('9 שעות')
    expect(days[0]?.tone).toBe('full')
    expect(days[0]?.tags.some((tag) => tag.text === '2 פרויקטים מדווחים')).toBe(true)
  })

  it('shows חסר when project hours are less than the attendance window', () => {
    const days = mapReportsToHomeDays([
      row({ hours: 3.5, durationHours: 3.5, startTime: '09:00', endTime: '18:00' }),
    ])

    expect(days[0]?.status).toBe('חסר')
    expect(days[0]?.tone).toBe('missing')
  })

  it('does not show חסר when project hours exceed the attendance window', () => {
    const days = mapReportsToHomeDays([
      row({ hours: 10, durationHours: 10, startTime: '09:00', endTime: '18:00' }),
    ])

    expect(days[0]?.status).toBe('9 שעות')
    expect(days[0]?.tone).toBe('full')
  })

  it('does not show חסר when leftover window time is under 0.1 hours', () => {
    const days = mapReportsToHomeDays([
      row({ hours: 7.6, durationHours: 7.6, startTime: '09:00', endTime: '16:40' }),
    ])

    expect(days[0]?.status).not.toBe('חסר')
    expect(days[0]?.tone).not.toBe('missing')
  })

  it('shows a short attendance window as partial hours when projects fill it', () => {
    const days = mapReportsToHomeDays([
      row({ hours: 3.5, durationHours: 3.5, startTime: '09:00', endTime: '12:30' }),
    ])

    expect(days[0]?.status).toBe('3.5 שעות')
    expect(days[0]?.tone).toBe('partial')
  })

  it('sorts newest day first', () => {
    const days = mapReportsToHomeDays([
      row({ id: 'r1', date: '2026-08-10' }),
      row({ id: 'r2', date: '2026-08-17' }),
    ])

    expect(days.map((day) => day.isoDate)).toEqual(['2026-08-17', '2026-08-10'])
  })
})

describe('buildHomeDays', () => {
  it('sorts hours, absences, and weekends by date newest first', () => {
    const days = buildHomeDays({
      reports: [row({ id: 'r1', date: '2026-08-10' })],
      absences: [
        {
          id: 'a1',
          userId: 'u1',
          type: 'SICK',
          startDate: '2026-08-12',
          endDate: '2026-08-12',
          halfDay: false,
          workingDayCount: 1,
          attachments: [],
        },
      ],
      weekendDates: ['2026-08-14', '2026-08-15'],
    })

    expect(days.map((day) => day.isoDate)).toEqual(['2026-08-15', '2026-08-14', '2026-08-12', '2026-08-10'])
    expect(days[0]?.status).toBe('סופ״ש')
    expect(days[2]?.status).toBe('מחלה 😷')
  })

  it('keeps reported hours when a date also has an absence', () => {
    const days = buildHomeDays({
      reports: [row({ date: '2026-08-12' })],
      absences: [
        {
          id: 'a1',
          userId: 'u1',
          type: 'VACATION',
          startDate: '2026-08-12',
          endDate: '2026-08-12',
          halfDay: false,
          workingDayCount: 1,
          attachments: [],
        },
      ],
    })

    expect(days).toHaveLength(1)
    expect(days[0]?.tone).toBe('full')
  })

  it('shows חג for a holiday absence instead of a missing work day', () => {
    const days = buildHomeDays({
      absences: [
        {
          id: 'a1',
          userId: 'u1',
          type: 'HOLIDAY',
          startDate: '2026-04-01',
          endDate: '2026-04-01',
          halfDay: false,
          workingDayCount: 1,
          attachments: [],
        },
      ],
    })

    expect(days).toHaveLength(1)
    expect(days[0]?.status).toBe('חג 🎉')
    expect(days[0]?.tone).toBe('absence')
    expect(days[0]?.absenceType).toBe('HOLIDAY')
  })
})
