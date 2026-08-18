import { describe, expect, it } from 'vitest'
import { attendanceWindowHours, manualReportSchema } from './ManualReport.schema'

function aDay(overrides: Record<string, unknown> = {}) {
  return {
    date: '2026-08-17',
    dayStart: '09:00',
    dayEnd: '18:00',
    rows: [
      {
        clientId: 'client-1',
        projectId: 'project-1',
        taskId: 'task-1',
        workLocation: 'OFFICE',
        hours: 4,
        description: '',
      },
    ],
    ...overrides,
  }
}

function fieldsOf(result: ReturnType<typeof manualReportSchema.safeParse>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('manualReportSchema', () => {
  it('accepts a day with one complete project row', () => {
    expect(manualReportSchema.safeParse(aDay()).success).toBe(true)
  })

  it('rejects a day with no project rows', () => {
    const result = manualReportSchema.safeParse(aDay({ rows: [] }))

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toContain('rows')
  })

  it('accepts an overnight attendance window', () => {
    expect(attendanceWindowHours('22:00', '06:00')).toBe(8)
    expect(manualReportSchema.safeParse(aDay({ dayStart: '22:00', dayEnd: '06:00', rows: [{ ...aDay().rows[0], hours: 8 }] })).success).toBe(
      true,
    )
  })

  it('rejects hours of 0', () => {
    const result = manualReportSchema.safeParse(aDay({ rows: [{ ...aDay().rows[0], hours: 0 }] }))

    expect(fieldsOf(result)).toContain('rows.0.hours')
  })

  it('accepts a one-decimal allocation such as 3.3', () => {
    expect(manualReportSchema.safeParse(aDay({ rows: [{ ...aDay().rows[0], hours: 3.3 }] })).success).toBe(true)
  })

  it('rejects more than one decimal place', () => {
    const result = manualReportSchema.safeParse(aDay({ rows: [{ ...aDay().rows[0], hours: 3.34 }] }))

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toContain('rows.0.hours')
  })

  it('rejects a sum of hours larger than the window', () => {
    const result = manualReportSchema.safeParse(
      aDay({
        rows: [
          { ...aDay().rows[0], hours: 5 },
          { ...aDay().rows[0], projectId: 'project-2', taskId: 'task-2', hours: 5 },
        ],
      }),
    )

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toContain('rows')
  })

  it('accepts two rows that sit under the window', () => {
    expect(
      manualReportSchema.safeParse(
        aDay({
          rows: [
            { ...aDay().rows[0], hours: 4 },
            { ...aDay().rows[0], projectId: 'project-2', taskId: 'task-2', hours: 3 },
          ],
        }),
      ).success,
    ).toBe(true)
  })

  it('names every field the employee still has to pick', () => {
    const result = manualReportSchema.safeParse(
      aDay({
        rows: [{ ...aDay().rows[0], projectId: '', taskId: '', workLocation: '' }],
      }),
    )

    expect(fieldsOf(result)).toEqual(
      expect.arrayContaining(['rows.0.projectId', 'rows.0.taskId', 'rows.0.workLocation']),
    )
  })
})
