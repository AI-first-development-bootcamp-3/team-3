import { describe, expect, it } from 'vitest'
import { mapReportsToHomeDays } from './monthlyReportDays'
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
    description: 'QA',
    clientName: 'Globex',
    projectName: 'Mobile',
    taskName: 'QA',
    durationHours: 9,
    ...overrides,
  }
}

describe('mapReportsToHomeDays', () => {
  it('groups rows by date and marks a full workday as 9 שעות', () => {
    const days = mapReportsToHomeDays([
      row({ id: 'r1', projectId: 'p1', durationHours: 4, startTime: '09:00', endTime: '13:00' }),
      row({ id: 'r2', projectId: 'p2', durationHours: 5, startTime: '13:00', endTime: '18:00' }),
    ])

    expect(days).toHaveLength(1)
    expect(days[0]?.status).toBe('9 שעות')
    expect(days[0]?.tone).toBe('full')
    expect(days[0]?.tags.some((tag) => tag.text === '2 פרויקטים מדווחים')).toBe(true)
  })

  it('sorts newest day first', () => {
    const days = mapReportsToHomeDays([
      row({ id: 'r1', date: '2026-08-10' }),
      row({ id: 'r2', date: '2026-08-17' }),
    ])

    expect(days.map((day) => day.isoDate)).toEqual(['2026-08-17', '2026-08-10'])
  })
})
