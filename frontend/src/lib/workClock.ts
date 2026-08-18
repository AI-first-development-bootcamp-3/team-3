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

export function clockErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || !('error' in body)) return undefined
  const error = (body as { error?: { message?: string } }).error
  return typeof error?.message === 'string' ? error.message : undefined
}
