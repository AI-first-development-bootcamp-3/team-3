import { request } from './apiClient'
import type { ClockSession, ClockSessionResponse } from '../types/clock'

export function getClockSession(): Promise<ClockSessionResponse> {
  return request<ClockSessionResponse>('/me/clock/session')
}

export function startClock(): Promise<{ session: ClockSession }> {
  return request<{ session: ClockSession }>('/me/clock/start', { method: 'POST' })
}

export function stopClock(): Promise<{ session: ClockSession }> {
  return request<{ session: ClockSession }>('/me/clock/stop', { method: 'POST' })
}

export function discardClock(): Promise<void> {
  return request<void>('/me/clock/discard', { method: 'POST' })
}

export function completeClock(): Promise<void> {
  return request<void>('/me/clock/complete', { method: 'POST' })
}
