import { describe, expect, it } from 'vitest'
import { manualReportSchema } from './ManualReport.schema'

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
        startTime: '09:00',
        endTime: '13:00',
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
  });

  it('rejects a day with no project rows', () => {
    const result = manualReportSchema.safeParse(aDay({ rows: [] }))

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toContain('rows')
  })

  it('rejects a row whose end time precedes its start time', () => {
    const result = manualReportSchema.safeParse(
      aDay({ rows: [{ ...aDay().rows[0], startTime: '15:00', endTime: '11:00' }] }),
    )

    expect(fieldsOf(result)).toContain('rows.0.endTime')
  })

  it('rejects a row that runs past the time the employee clocked out', () => {
    const result = manualReportSchema.safeParse(
      aDay({ rows: [{ ...aDay().rows[0], startTime: '17:00', endTime: '20:00' }] }),
    )

    expect(fieldsOf(result)).toContain('rows.0.endTime')
  })

  it('rejects a row that starts before the employee clocked in', () => {
    const result = manualReportSchema.safeParse(
      aDay({ rows: [{ ...aDay().rows[0], startTime: '07:00', endTime: '10:00' }] }),
    )

    expect(fieldsOf(result)).toContain('rows.0.startTime')
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

  it('rejects clocking out before clocking in', () => {
    const result = manualReportSchema.safeParse(aDay({ dayStart: '18:00', dayEnd: '09:00' }))

    expect(fieldsOf(result)).toContain('dayEnd')
  })
})
