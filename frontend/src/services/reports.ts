import { request } from './apiClient'
import type { Report, ReportingOptions } from '../types'

export type CreateReportInput = Omit<Report, 'id' | 'userId'>

export function getReportingOptions(): Promise<ReportingOptions> {
  return request<ReportingOptions>('/me/reporting-options')
}

export function createReport(body: CreateReportInput): Promise<Report> {
  return request<Report>('/reports', { method: 'POST', body })
}
