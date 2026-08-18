import { request } from './apiClient'
import type {
  CreateReportBatchInput,
  CreateReportBatchResult,
  ListReportsResult,
  Report,
  ReportingOptions,
} from '../types'

export type CreateReportInput = Omit<Report, 'id' | 'userId'>

export function getReportingOptions(): Promise<ReportingOptions> {
  return request<ReportingOptions>('/me/reporting-options')
}

export function createReport(body: CreateReportInput): Promise<Report> {
  return request<Report>('/reports', { method: 'POST', body })
}

/** Saves every project row of one day together; the API rejects the day as a whole. */
export function createReportBatch(body: CreateReportBatchInput): Promise<CreateReportBatchResult> {
  return request<CreateReportBatchResult>('/reports/batch', { method: 'POST', body })
}

export function listReports(month: number, year: number): Promise<ListReportsResult> {
  const params = new URLSearchParams({ month: String(month), year: String(year) })
  return request<ListReportsResult>(`/reports?${params}`)
}

/** Removes every saved row of one calendar day for the signed-in caller. */
export function deleteReportsForDate(date: string): Promise<void> {
  const params = new URLSearchParams({ date })
  return request<void>(`/reports?${params}`, { method: 'DELETE' })
}
