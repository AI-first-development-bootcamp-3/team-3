import { request } from './apiClient'
import { API_URL } from './env'
import type { Absence, CreateAbsenceInput } from '../types'

export interface AttachmentMetadata {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
}

export function listAbsences(month: number, year: number): Promise<{ absences: Absence[] }> {
  const params = new URLSearchParams({ month: String(month), year: String(year) })
  return request<{ absences: Absence[] }>(`/absences?${params}`)
}

export function createAbsence(body: CreateAbsenceInput): Promise<Absence> {
  return request<Absence>('/absences', { method: 'POST', body })
}

export function updateAbsence(id: string, body: CreateAbsenceInput): Promise<Absence> {
  return request<Absence>(`/absences/${id}`, { method: 'PATCH', body })
}

export function deleteAbsence(id: string): Promise<void> {
  return request<void>(`/absences/${id}`, { method: 'DELETE' })
}

export async function uploadAttachment(file: File): Promise<AttachmentMetadata> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/attachments`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to upload attachment')
  }

  return response.json()
}
