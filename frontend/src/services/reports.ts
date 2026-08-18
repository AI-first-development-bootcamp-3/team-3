import { request } from './apiClient'
import type {
  CreateReportBatchInput,
  CreateReportBatchResult,
  ListReportsResult,
  Report,
  ReportFormat,
  ReportingOptions,
  ReportRowInput,
  ReportRowTimeFields,
  WorkLocation,
} from '../types'

export type CreateReportInput = Omit<
  Report,
  'id' | 'userId' | 'hours' | 'rowStartTime' | 'rowEndTime'
> &
  ReportRowTimeFields

/** One project card as the form holds it, before the format picks its fields. */
export interface ReportRowDraft {
  clientId: string
  projectId: string
  taskId: string
  workLocation: WorkLocation
  description: string
  hours?: unknown
  rowStartTime?: string | undefined
  rowEndTime?: string | undefined
}

/**
 * Shapes one row for the API according to its project's `reportFormat`: a
 * `CLOCK_IN_OUT` row sends only its clock pair and a `SUM_HOURS` row only its
 * hours. Sending the other format's fields is a `400`, so a stale value the
 * card no longer shows must never reach the request.
 */
export function toReportRow(row: ReportRowDraft, reportFormat: ReportFormat): ReportRowInput {
  const base = {
    clientId: row.clientId,
    projectId: row.projectId,
    taskId: row.taskId,
    workLocation: row.workLocation,
    description: row.description,
  }
  if (reportFormat === 'CLOCK_IN_OUT') {
    return { ...base, rowStartTime: row.rowStartTime ?? '', rowEndTime: row.rowEndTime ?? '' }
  }
  return { ...base, hours: Number(row.hours ?? 0) }
}

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
