import { z } from 'zod'
import type { ReportFormat, ReportingOptions } from '../types'

const hhmm = z.string().min(1, 'יש לבחור שעה').regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'שעה בפורמט HH:mm')

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

function minutesFromHhmm(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

/** Overnight-aware day window. Equal clocks are zero hours. */
export function attendanceWindowHours(startTime: string, endTime: string): number {
  if (!HHMM.test(startTime) || !HHMM.test(endTime)) return 0
  const start = minutesFromHhmm(startTime)
  const end = minutesFromHhmm(endTime)
  if (end === start) return 0
  const minutes = end > start ? end - start : 24 * 60 - start + end
  return minutes / 60
}

/** Mirrors the backend's `attendanceWindow.ts` helpers of the same names — the
 * form and the service must agree on what fits inside a day, so these three
 * stay identical to their server counterparts. */
export function minutesIntoWindow(dayStart: string, clock: string): number {
  const start = minutesFromHhmm(dayStart)
  const at = minutesFromHhmm(clock)
  return at >= start ? at - start : 24 * 60 - start + at
}

export interface RowInterval {
  start: number
  end: number
}

export function rowIntervalOnDayAxis(dayStart: string, rowStart: string, rowEnd: string): RowInterval {
  const start = minutesIntoWindow(dayStart, rowStart)
  const end = minutesIntoWindow(dayStart, rowEnd)
  return { start, end: end === 0 ? 24 * 60 : end }
}

export function intervalsOverlap(a: RowInterval, b: RowInterval): boolean {
  return a.start < b.end && b.start < a.end
}

/** Hours shown for a clock-in/out row. One decimal, matching the column the
 * server stores it in. */
export function derivedHoursFromMinutes(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10
}

/** Hours a clock-in/out row contributes, or 0 when its pair is incomplete. */
export function derivedRowHours(dayStart: string, rowStart: string, rowEnd: string): number {
  if (!HHMM.test(dayStart) || !HHMM.test(rowStart) || !HHMM.test(rowEnd)) return 0
  const { start, end } = rowIntervalOnDayAxis(dayStart, rowStart, rowEnd)
  return derivedHoursFromMinutes(Math.max(0, end - start))
}

function isOneDecimalHours(value: number): boolean {
  if (!Number.isFinite(value)) return false
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-9
}

/** The row's own time fields stay loose in the object schema: which of them a
 * row must carry depends on its project's format, which only the reporting
 * options know, so the whole choice is made in the day-level `superRefine`. */
const projectRowSchema = z.object({
  clientId: z.string().min(1, 'יש לבחור פרויקט'),
  projectId: z.string().min(1, 'יש לבחור פרויקט'),
  taskId: z.string().min(1, 'יש לבחור משימה'),
  workLocation: z
    .union([z.literal(''), z.enum(['OFFICE', 'CLIENT', 'HOME'])])
    .refine((value) => value !== '', { message: 'יש לבחור מיקום' }),
  hours: z.unknown().optional(),
  rowStartTime: z.string().optional(),
  rowEndTime: z.string().optional(),
  /** The format this row was already saved under, set when a day is rehydrated
   * (design D6). Form state only — never part of the request body. */
  savedFormat: z.enum(['SUM_HOURS', 'CLOCK_IN_OUT']).optional(),
  description: z.string().trim().max(2000, 'הפירוט ארוך מדי'),
})

export const OVERFLOW_HOURS_MESSAGE = 'סכום שעות הפרויקטים גדול מחלון הכניסה–יציאה'
export const HOURS_RANGE_MESSAGE = 'יש להזין מספר בין 0.5 ל-24, עם לכל היותר ספרה אחת אחרי הנקודה'
export const ROW_START_REQUIRED_MESSAGE = 'יש לבחור שעת כניסה לפרויקט'
export const ROW_END_REQUIRED_MESSAGE = 'יש לבחור שעת יציאה לפרויקט'
export const ROW_ZERO_LENGTH_MESSAGE = 'שעת היציאה חייבת להיות מאוחרת משעת הכניסה'
export const ROW_OUTSIDE_WINDOW_MESSAGE = 'שעות הפרויקט חייבות להיות בתוך חלון הכניסה–יציאה של היום'
export const ROWS_OVERLAP_MESSAGE = 'שני פרויקטים לא יכולים להיות מדווחים על אותו פרק זמן'

/** The format a card reports in, read off the options tree the form loaded —
 * an unpicked or unknown project falls back to the typed hours field. */
export function projectFormat(
  options: ReportingOptions | null | undefined,
  clientId: string,
  projectId: string,
): ReportFormat {
  const project = options?.clients
    .find((client) => client.id === clientId)
    ?.projects.find((item) => item.id === projectId)
  return project?.reportFormat ?? 'SUM_HOURS'
}

/** What one card of the form reports in. A row loaded from a saved day keeps
 * the format it was reported under (design D6) — an admin switching the
 * project's setting afterwards must not rewrite history through the form. Any
 * other card follows its project's current format. */
export function rowFormat(
  row: { clientId: string; projectId: string; savedFormat?: ReportFormat },
  options: ReportingOptions | null | undefined,
): ReportFormat {
  return row.savedFormat ?? projectFormat(options, row.clientId, row.projectId)
}

/** Hours one card contributes to the day: derived from its clock pair, or the
 * number the employee typed. */
export function rowAllocatedHours(
  options: ReportingOptions | null | undefined,
  dayStart: string,
  row: {
    clientId: string
    projectId: string
    savedFormat?: ReportFormat
    hours?: unknown
    rowStartTime?: string
    rowEndTime?: string
  },
): number {
  if (rowFormat(row, options) === 'CLOCK_IN_OUT') {
    return derivedRowHours(dayStart, row.rowStartTime ?? '', row.rowEndTime ?? '')
  }
  const hours = Number(row.hours)
  return Number.isFinite(hours) ? hours : 0
}

/** Every row that shares a minute with another one — all of them, so the form
 * can mark each clashing card rather than only the first. */
function overlappingIndexes(rows: { index: number; interval: RowInterval }[]): number[] {
  const clashing = new Set<number>()
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      if (intervalsOverlap(rows[i]!.interval, rows[j]!.interval)) {
        clashing.add(rows[i]!.index)
        clashing.add(rows[j]!.index)
      }
    }
  }
  return [...clashing].sort((a, b) => a - b)
}

/**
 * The day schema, built around the reporting options so each row is validated
 * against its own project's report format (design D7 — Zod cannot look the
 * format up on its own).
 */
export function buildManualReportSchema(options: ReportingOptions | null | undefined) {
  return z
    .object({
      date: z.string().min(1, 'יש לבחור תאריך').regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך בפורמט YYYY-MM-DD'),
      dayStart: hhmm,
      dayEnd: hhmm,
      rows: z.array(projectRowSchema).min(1, 'יש להוסיף לפחות פרויקט אחד'),
    })
    .superRefine((day, ctx) => {
      const windowHours = attendanceWindowHours(day.dayStart, day.dayEnd)
      const windowMinutes = Math.round(windowHours * 60)
      const clockRows: { index: number; interval: RowInterval }[] = []
      let allocated = 0

      day.rows.forEach((row, index) => {
        if (rowFormat(row, options) === 'SUM_HOURS') {
          const hours = Number(row.hours)
          if (!(hours >= 0.5 && hours <= 24 && isOneDecimalHours(hours))) {
            ctx.addIssue({ code: 'custom', path: ['rows', index, 'hours'], message: HOURS_RANGE_MESSAGE })
            return
          }
          allocated += hours
          return
        }

        const rowStart = row.rowStartTime ?? ''
        const rowEnd = row.rowEndTime ?? ''
        if (!HHMM.test(rowStart)) {
          ctx.addIssue({ code: 'custom', path: ['rows', index, 'rowStartTime'], message: ROW_START_REQUIRED_MESSAGE })
        }
        if (!HHMM.test(rowEnd)) {
          ctx.addIssue({ code: 'custom', path: ['rows', index, 'rowEndTime'], message: ROW_END_REQUIRED_MESSAGE })
        }
        if (!HHMM.test(rowStart) || !HHMM.test(rowEnd)) return

        const interval = rowIntervalOnDayAxis(day.dayStart, rowStart, rowEnd)
        if (interval.start >= windowMinutes) {
          ctx.addIssue({ code: 'custom', path: ['rows', index, 'rowStartTime'], message: ROW_OUTSIDE_WINDOW_MESSAGE })
          return
        }
        if (interval.end <= interval.start) {
          ctx.addIssue({ code: 'custom', path: ['rows', index, 'rowEndTime'], message: ROW_ZERO_LENGTH_MESSAGE })
          return
        }
        if (interval.end > windowMinutes) {
          ctx.addIssue({ code: 'custom', path: ['rows', index, 'rowEndTime'], message: ROW_OUTSIDE_WINDOW_MESSAGE })
          return
        }

        allocated += derivedHoursFromMinutes(interval.end - interval.start)
        clockRows.push({ index, interval })
      })

      for (const index of overlappingIndexes(clockRows)) {
        ctx.addIssue({ code: 'custom', path: ['rows', index, 'rowStartTime'], message: ROWS_OVERLAP_MESSAGE })
      }

      if (allocated > windowHours + 1e-9) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows'],
          message: OVERFLOW_HOURS_MESSAGE,
        })
      }
    })
}

export type ManualReportSchema = ReturnType<typeof buildManualReportSchema>
export type ManualReportValues = z.input<ManualReportSchema>
export type ProjectRowValues = ManualReportValues['rows'][number]
