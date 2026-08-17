import { request } from './apiClient'
import type { Absence, CreateAbsenceInput } from '../types'

export function createAbsence(body: CreateAbsenceInput): Promise<Absence> {
  return request<Absence>('/absences', { method: 'POST', body })
}