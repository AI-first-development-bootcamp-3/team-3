import type { ReportFormat, ReportRowTimeFields } from '../types'
import type { ClockSegment } from '../types/clock'

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

export function totalSessionMinutes(segments: ClockSegment[]): number {
  return segments.reduce((sum, segment) => sum + segment.durationMinutes, 0)
}

export function segmentHours(segment: ClockSegment): number {
  if (segment.durationMinutes <= 0) return 0
  const hours = segment.durationMinutes / 60
  const rounded = Math.round(hours * 10) / 10
  return Math.max(0, rounded)
}

/** Advances `HH:mm` by one minute. Stays put at `23:59` so the value remains a same-day clock. */
export function addOneMinute(hhmm: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm)
  if (!match) return hhmm
  const next = Number(match[1]) * 60 + Number(match[2]) + 1
  if (next >= 24 * 60) return hhmm
  const hours = Math.floor(next / 60)
  const minutes = next % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Day attendance window for one clock segment. A CLOCK_IN_OUT row cannot be
 * zero-length, so a stop in the same displayed minute is stored as one minute.
 */
export function attendanceTimesForSegment(segment: ClockSegment): { startTime: string; endTime: string } {
  if (segment.startTime === segment.endTime) {
    return { startTime: segment.startTime, endTime: addOneMinute(segment.endTime) }
  }
  return { startTime: segment.startTime, endTime: segment.endTime }
}

/**
 * The time fields `POST /reports` accepts for this project's `reportFormat`.
 * Sending `hours` to a CLOCK_IN_OUT project (or a clock pair to SUM_HOURS) is a 400.
 */
export function clockReportTimeFields(segment: ClockSegment, reportFormat: ReportFormat): ReportRowTimeFields {
  if (reportFormat === 'CLOCK_IN_OUT') {
    const pair = attendanceTimesForSegment(segment)
    return { rowStartTime: pair.startTime, rowEndTime: pair.endTime }
  }
  return { hours: segmentHours(segment) }
}

export function clockErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || !('error' in body)) return undefined
  const error = (body as { error?: { message?: string } }).error
  return typeof error?.message === 'string' ? error.message : undefined
}
