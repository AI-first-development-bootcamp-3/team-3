import { request } from './apiClient'
import type { ReportingOptions } from '../types'

export function getReportingOptions(): Promise<ReportingOptions> {
  return request<ReportingOptions>('/me/reporting-options')
}
