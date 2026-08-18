import { describe, expect, it } from 'vitest'
import type { ReportingOptions } from '../types'
import {
  attendanceWindowHours,
  buildManualReportSchema,
  ROW_OUTSIDE_WINDOW_MESSAGE,
  ROW_START_REQUIRED_MESSAGE,
  ROW_ZERO_LENGTH_MESSAGE,
  ROWS_OVERLAP_MESSAGE,
} from './ManualReport.schema'

const options: ReportingOptions = {
  clients: [
    {
      id: 'client-1',
      name: 'אל-על',
      projects: [
        { id: 'project-1', name: 'Cargo', reportFormat: 'SUM_HOURS', tasks: [{ id: 'task-1', name: 'UI UX Design' }] },
        { id: 'project-2', name: 'abra app', reportFormat: 'SUM_HOURS', tasks: [{ id: 'task-2', name: 'Consulting' }] },
        { id: 'project-3', name: 'משמרות', reportFormat: 'CLOCK_IN_OUT', tasks: [{ id: 'task-3', name: 'Shifts' }] },
        { id: 'project-4', name: 'משמרות ערב', reportFormat: 'CLOCK_IN_OUT', tasks: [{ id: 'task-4', name: 'Night' }] },
      ],
    },
  ],
}

const schema = buildManualReportSchema(options)

function sumRow(overrides: Record<string, unknown> = {}) {
  return {
    clientId: 'client-1',
    projectId: 'project-1',
    taskId: 'task-1',
    workLocation: 'OFFICE',
    hours: 4,
    description: '',
    ...overrides,
  }
}

function clockRow(rowStartTime: string, rowEndTime: string, overrides: Record<string, unknown> = {}) {
  return {
    clientId: 'client-1',
    projectId: 'project-3',
    taskId: 'task-3',
    workLocation: 'OFFICE',
    rowStartTime,
    rowEndTime,
    description: '',
    ...overrides,
  }
}

function aDay(overrides: Record<string, unknown> = {}) {
  return {
    date: '2026-08-17',
    dayStart: '09:00',
    dayEnd: '18:00',
    rows: [sumRow()],
    ...overrides,
  }
}

function fieldsOf(result: ReturnType<typeof schema.safeParse>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

function messagesOf(result: ReturnType<typeof schema.safeParse>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('buildManualReportSchema', () => {
  it('accepts a day with one complete project row', () => {
    expect(schema.safeParse(aDay()).success).toBe(true)
  })

  it('rejects a day with no project rows', () => {
    const result = schema.safeParse(aDay({ rows: [] }))

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toContain('rows')
  })

  it('accepts an overnight attendance window', () => {
    expect(attendanceWindowHours('22:00', '06:00')).toBe(8)
    expect(schema.safeParse(aDay({ dayStart: '22:00', dayEnd: '06:00', rows: [sumRow({ hours: 8 })] })).success).toBe(
      true,
    )
  })

  it('treats equal entry and exit times as zero hours', () => {
    expect(attendanceWindowHours('15:52', '15:52')).toBe(0)
  })

  it('rejects hours of 0', () => {
    const result = schema.safeParse(aDay({ rows: [sumRow({ hours: 0 })] }))

    expect(fieldsOf(result)).toContain('rows.0.hours')
  })

  it('accepts a one-decimal allocation such as 3.3', () => {
    expect(schema.safeParse(aDay({ rows: [sumRow({ hours: 3.3 })] })).success).toBe(true)
  })

  it('rejects more than one decimal place', () => {
    const result = schema.safeParse(aDay({ rows: [sumRow({ hours: 3.34 })] }))

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toContain('rows.0.hours')
  })

  it('rejects a sum of hours larger than the window', () => {
    const result = schema.safeParse(
      aDay({
        rows: [sumRow({ hours: 5 }), sumRow({ projectId: 'project-2', taskId: 'task-2', hours: 5 })],
      }),
    )

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toContain('rows')
  })

  it('accepts two rows that sit under the window', () => {
    expect(
      schema.safeParse(
        aDay({
          rows: [sumRow({ hours: 4 }), sumRow({ projectId: 'project-2', taskId: 'task-2', hours: 3 })],
        }),
      ).success,
    ).toBe(true)
  })

  it('names every field the employee still has to pick', () => {
    const result = schema.safeParse(
      aDay({
        rows: [sumRow({ projectId: '', taskId: '', workLocation: '' })],
      }),
    )

    expect(fieldsOf(result)).toEqual(
      expect.arrayContaining(['rows.0.projectId', 'rows.0.taskId', 'rows.0.workLocation']),
    )
  })

  it('accepts a clock-in/out row inside the day window', () => {
    expect(schema.safeParse(aDay({ rows: [clockRow('10:00', '13:00')] })).success).toBe(true)
  })

  it('accepts a clock-in/out row that spans the whole window', () => {
    expect(schema.safeParse(aDay({ rows: [clockRow('09:00', '18:00')] })).success).toBe(true)
  })

  it('accepts a clock-in/out row inside an overnight window', () => {
    expect(
      schema.safeParse(aDay({ dayStart: '22:00', dayEnd: '06:00', rows: [clockRow('23:00', '02:00')] })).success,
    ).toBe(true)
  })

  it('requires both clock times on a clock-in/out row', () => {
    const result = schema.safeParse(aDay({ rows: [clockRow('', '')] }))

    expect(fieldsOf(result)).toEqual(
      expect.arrayContaining(['rows.0.rowStartTime', 'rows.0.rowEndTime']),
    )
    expect(messagesOf(result)).toContain(ROW_START_REQUIRED_MESSAGE)
  })

  it('does not ask a clock-in/out row for typed hours', () => {
    const result = schema.safeParse(aDay({ rows: [clockRow('10:00', '13:00', { hours: 0 })] }))

    expect(result.success).toBe(true)
  })

  it('rejects a clock pair starting before the day window', () => {
    const result = schema.safeParse(aDay({ rows: [clockRow('08:00', '13:00')] }))

    expect(fieldsOf(result)).toContain('rows.0.rowStartTime')
    expect(messagesOf(result)).toContain(ROW_OUTSIDE_WINDOW_MESSAGE)
  })

  it('rejects a clock pair ending after the day window', () => {
    const result = schema.safeParse(aDay({ rows: [clockRow('16:00', '19:00')] }))

    expect(fieldsOf(result)).toContain('rows.0.rowEndTime')
    expect(messagesOf(result)).toContain(ROW_OUTSIDE_WINDOW_MESSAGE)
  })

  it('rejects a zero-length clock pair', () => {
    const result = schema.safeParse(aDay({ rows: [clockRow('10:00', '10:00')] }))

    expect(fieldsOf(result)).toContain('rows.0.rowEndTime')
    expect(messagesOf(result)).toContain(ROW_ZERO_LENGTH_MESSAGE)
  })

  it('marks every clock-in/out row of an overlap, not only the first', () => {
    const result = schema.safeParse(
      aDay({
        rows: [
          clockRow('09:00', '13:00'),
          clockRow('12:00', '17:00', { projectId: 'project-4', taskId: 'task-4' }),
        ],
      }),
    )

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toEqual(
      expect.arrayContaining(['rows.0.rowStartTime', 'rows.1.rowStartTime']),
    )
    expect(messagesOf(result).filter((message) => message === ROWS_OVERLAP_MESSAGE)).toHaveLength(2)
  })

  it('rejects a clock-in/out row fully containing another', () => {
    const result = schema.safeParse(
      aDay({
        rows: [
          clockRow('09:00', '17:00'),
          clockRow('10:00', '12:00', { projectId: 'project-4', taskId: 'task-4' }),
        ],
      }),
    )

    expect(messagesOf(result)).toContain(ROWS_OVERLAP_MESSAGE)
  })

  it('accepts clock-in/out rows that only touch at an endpoint', () => {
    expect(
      schema.safeParse(
        aDay({
          rows: [
            clockRow('09:00', '13:00'),
            clockRow('13:00', '17:00', { projectId: 'project-4', taskId: 'task-4' }),
          ],
        }),
      ).success,
    ).toBe(true)
  })

  it('never raises an overlap for sum-hours rows', () => {
    const result = schema.safeParse(
      aDay({
        rows: [
          clockRow('09:00', '13:00'),
          sumRow({ hours: 2 }),
          sumRow({ projectId: 'project-2', taskId: 'task-2', hours: 2 }),
        ],
      }),
    )

    expect(result.success).toBe(true)
  })

  it('accepts a mixed day of typed and derived hours under the window', () => {
    expect(schema.safeParse(aDay({ rows: [sumRow({ hours: 4 }), clockRow('09:00', '12:00')] })).success).toBe(true)
  })

  it('counts derived hours toward the window total', () => {
    const result = schema.safeParse(aDay({ rows: [clockRow('09:00', '17:00'), sumRow({ hours: 2 })] }))

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toContain('rows')
  })

  it('reads a card with no project yet as a typed-hours card', () => {
    const result = schema.safeParse(aDay({ rows: [sumRow({ clientId: '', projectId: '', hours: 0 })] }))

    expect(fieldsOf(result)).toContain('rows.0.hours')
  })

  describe('a saved row keeps the format it was reported under', () => {
    it('validates a saved clock row as a clock row on a now סיכום שעות project', () => {
      const result = schema.safeParse(
        aDay({
          rows: [clockRow('10:00', '13:00', { projectId: 'project-1', taskId: 'task-1', savedFormat: 'CLOCK_IN_OUT' })],
        }),
      )

      expect(result.success).toBe(true)
    })

    it('asks a saved clock row for its clock pair rather than typed hours', () => {
      const result = schema.safeParse(
        aDay({
          rows: [
            clockRow('', '', { projectId: 'project-1', taskId: 'task-1', hours: 4, savedFormat: 'CLOCK_IN_OUT' }),
          ],
        }),
      )

      expect(fieldsOf(result)).toEqual(expect.arrayContaining(['rows.0.rowStartTime', 'rows.0.rowEndTime']))
      expect(fieldsOf(result)).not.toContain('rows.0.hours')
    })

    it('counts a saved clock row derived hours toward the window', () => {
      const result = schema.safeParse(
        aDay({
          rows: [
            clockRow('09:00', '17:00', {
              projectId: 'project-1',
              taskId: 'task-1',
              savedFormat: 'CLOCK_IN_OUT',
            }),
            sumRow({ projectId: 'project-2', taskId: 'task-2', hours: 2 }),
          ],
        }),
      )

      expect(result.success).toBe(false)
      expect(fieldsOf(result)).toContain('rows')
    })

    it('validates a saved hours row as typed hours on a now כניסה/יציאה project', () => {
      expect(
        schema.safeParse(
          aDay({
            rows: [sumRow({ projectId: 'project-3', taskId: 'task-3', hours: 4, savedFormat: 'SUM_HOURS' })],
          }),
        ).success,
      ).toBe(true)
    })

    it('does not ask a saved hours row for a clock pair', () => {
      const result = schema.safeParse(
        aDay({
          rows: [sumRow({ projectId: 'project-3', taskId: 'task-3', hours: 0, savedFormat: 'SUM_HOURS' })],
        }),
      )

      expect(fieldsOf(result)).toContain('rows.0.hours')
      expect(fieldsOf(result)).not.toContain('rows.0.rowStartTime')
    })

    it('never clashes a saved hours row with a clock row over the same stretch', () => {
      const result = schema.safeParse(
        aDay({
          rows: [
            clockRow('09:00', '13:00'),
            sumRow({ projectId: 'project-4', taskId: 'task-4', hours: 2, savedFormat: 'SUM_HOURS' }),
          ],
        }),
      )

      expect(result.success).toBe(true)
    })
  })
})
