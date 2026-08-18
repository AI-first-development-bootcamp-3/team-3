import { request } from './apiClient'
import type { Absence, CreateAbsenceInput } from '../types'

export function listAbsences(month: number, year: number): Promise<{ absences: Absence[] }> {
  const params = new URLSearchParams({ month: String(month), year: String(year) })
  return request<{ absences: Absence[] }>(`/absences?${params}`)
}

export function createAbsence(body: CreateAbsenceInput): Promise<Absence> {
  return request<Absence>('/absences', { method: 'POST', body })
}

export function deleteAbsence(id: string): Promise<void> {
  return request<void>(`/absences/${id}`, { method: 'DELETE' })
}
