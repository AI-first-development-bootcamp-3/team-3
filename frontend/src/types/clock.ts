export type WorkClockSessionStatus = 'ACTIVE' | 'AWAITING_CONFIRM'

export interface ClockSegment {
  date: string
  startTime: string
  endTime: string
  durationMinutes: number
}

export interface ClockSession {
  sessionId: string
  status: WorkClockSessionStatus
  startedAt: string
  stoppedAt: string | null
  autoStopped: boolean
  segments: ClockSegment[]
}

export interface ClockSessionResponse {
  session: ClockSession | null
}
