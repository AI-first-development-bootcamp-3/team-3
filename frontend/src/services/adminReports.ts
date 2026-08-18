import { request } from './apiClient'
import type { CreateReportBatchInput, CreateReportBatchResult, ListReportsResult, ReportingOptions } from '../types'

export type TimeReportAuditAction = 'REPLACED' | 'DELETED'

export interface AdminTimeReportAudit {
  id: string
  employeeId: string
  actorId: string
  actorName: string
  date: string
  action: TimeReportAuditAction
  previousJson: unknown
  nextJson: unknown
  reason: string | null
  createdAt: string
}

export function listAdminEmployeeReports(
  userId: string,
  month: number,
  year: number,
): Promise<ListReportsResult> {
  const params = new URLSearchParams({ userId, month: String(month), year: String(year) })
  return request<ListReportsResult>(`/admin/reports?${params}`)
}

export function getAdminReportingOptions(userId: string): Promise<ReportingOptions> {
  const params = new URLSearchParams({ userId })
  return request<ReportingOptions>(`/admin/reports/options?${params}`)
}

export function listAdminEmployeeReportAudits(
  userId: string,
  month: number,
  year: number,
): Promise<{ audits: AdminTimeReportAudit[] }> {
  const params = new URLSearchParams({ userId, month: String(month), year: String(year) })
  return request<{ audits: AdminTimeReportAudit[] }>(`/admin/reports/audit?${params}`)
}

export function saveAdminEmployeeReportBatch(
  body: CreateReportBatchInput & { userId: string; reason?: string },
): Promise<CreateReportBatchResult> {
  return request<CreateReportBatchResult>('/admin/reports/batch', { method: 'POST', body })
}

export function deleteAdminEmployeeReports(userId: string, date: string, reason?: string): Promise<void> {
  const params = new URLSearchParams({ userId, date })
  if (reason) params.set('reason', reason)
  return request<void>(`/admin/reports?${params}`, { method: 'DELETE' })
}
