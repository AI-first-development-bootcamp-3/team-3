import { describe, expect, it } from 'vitest'
import { buildMonthKpis } from './monthKpis'
import type { Absence, TimeReportListItem } from '../types'

function row(overrides: Partial<TimeReportListItem> = {}): TimeReportListItem {
  return {
    id: 'r1',
    userId: 'u1',
    clientId: 'c1',
    projectId: 'p1',
    taskId: 't1',
    date: '2026-08-17',
    workLocation: 'OFFICE',
    startTime: '09:00',
    endTime: '18:00',
    hours: 9,
    description: '',
    clientName: 'Acme',
    projectName: 'Web',
    taskName: 'QA',
    durationHours: 9,
    ...overrides,
  }
}

function absence(overrides: Partial<Absence> = {}): Absence {
  return {
    id: 'a1',
    userId: 'u1',
    type: 'VACATION',
    startDate: '2026-08-17',
    endDate: '2026-08-19',
    halfDay: false,
    workingDayCount: 3,
    attachments: [],
    ...overrides,
  }
}

describe('buildMonthKpis', () => {
  it('sums project hours against a fixed 180-hour month', () => {
    const kpis = buildMonthKpis({
      reports: [row()],
      absences: [],
      year: 2026,
      month: 8,
      today: '2026-08-17',
    })

    expect(kpis['שעות חודשיות']).toEqual({ value: '9', caption: 'מתוך 180' })
    expect(kpis['פרויקטים מדווחים'].value).toBe('1')
    expect(kpis['דיווחים חסרים'].value).toBe('11')
    expect(kpis['ימי חופשה'].value).toBe('0')
    expect(kpis['ימי מחלה'].value).toBe('0')
  })

  it('does not count absence working days as missing reports', () => {
    const kpis = buildMonthKpis({
      reports: [],
      absences: [
        absence(),
        absence({ id: 'a2', type: 'SICK', startDate: '2026-08-12', endDate: '2026-08-12', workingDayCount: 1 }),
      ],
      year: 2026,
      month: 8,
      today: '2026-08-17',
    })

    expect(kpis['ימי חופשה'].value).toBe('3')
    expect(kpis['ימי מחלה'].value).toBe('1')
    // 12 Sun–Thu days through the 17th, minus vacation on the 17th and sick on the 12th.
    expect(kpis['דיווחים חסרים'].value).toBe('10')
    expect(kpis['שעות חודשיות'].caption).toBe('מתוך 180')
  })

  it('still counts a reported day as missing when hours do not match the window, even with an absence elsewhere', () => {
    const kpis = buildMonthKpis({
      reports: [row({ hours: 3, durationHours: 3 })],
      absences: [absence({ startDate: '2026-08-05', endDate: '2026-08-05', workingDayCount: 1 })],
      year: 2026,
      month: 8,
      today: '2026-08-17',
    })

    // 12 due days − 1 sick day; the 17th still counts because 3h ≠ 9h window.
    expect(kpis['דיווחים חסרים'].value).toBe('11')
  })

  it('counts a day as missing when project hours do not match the attendance window', () => {
    const kpis = buildMonthKpis({
      reports: [row({ hours: 3, durationHours: 3 })],
      absences: [],
      year: 2026,
      month: 8,
      today: '2026-08-17',
    })

    expect(kpis['דיווחים חסרים'].value).toBe('12')
  })

  it('counts a day as missing when project hours overflow the attendance window', () => {
    const kpis = buildMonthKpis({
      reports: [row({ hours: 10, durationHours: 10 })],
      absences: [],
      year: 2026,
      month: 8,
      today: '2026-08-17',
    })

    expect(kpis['דיווחים חסרים'].value).toBe('12')
  })

  it('still uses 180 hours in a past month and counts every Sun–Thu without a matching report', () => {
    const kpis = buildMonthKpis({
      reports: [],
      absences: [],
      year: 2026,
      month: 7,
      today: '2026-08-17',
    })

    expect(kpis['שעות חודשיות']).toEqual({ value: '0', caption: 'מתוך 180' })
    expect(kpis['דיווחים חסרים'].value).toBe('22')
  })

  it('shows vacation in a future month without treating future days as missing', () => {
    const kpis = buildMonthKpis({
      reports: [],
      absences: [absence({ startDate: '2026-09-06', endDate: '2026-09-07', workingDayCount: 2 })],
      year: 2026,
      month: 9,
      today: '2026-08-17',
    })

    expect(kpis['ימי חופשה'].value).toBe('2')
    expect(kpis['דיווחים חסרים'].value).toBe('0')
    expect(kpis['שעות חודשיות'].caption).toBe('מתוך 180')
  })
})
