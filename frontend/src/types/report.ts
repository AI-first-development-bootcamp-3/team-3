import type { Id, ISODateString } from './common'

export type WorkLocation = 'OFFICE' | 'CLIENT' | 'HOME'

export interface Report {
  id: Id
  userId: Id
  clientId: Id
  projectId: Id
  taskId: Id
  date: ISODateString
  workLocation: WorkLocation
  startTime: string
  endTime: string
  description: string
}

/** One project row of a day, as sent to `POST /reports/batch`. */
export type ReportRowInput = Omit<Report, 'id' | 'userId' | 'date'>

export interface CreateReportBatchInput {
  date: ISODateString
  rows: ReportRowInput[]
}

export interface CreateReportBatchResult {
  reports: Report[]
}

export interface TimeReportListItem extends Report {
  clientName: string
  projectName: string
  taskName: string
  durationHours: number
}

export interface ListReportsResult {
  reports: TimeReportListItem[]
}

export interface ReportingTaskOption {
  id: Id
  name: string
}

export interface ReportingProjectOption {
  id: Id
  name: string
  tasks: ReportingTaskOption[]
}

export interface ReportingClientOption {
  id: Id
  name: string
  projects: ReportingProjectOption[]
}

export interface ReportingOptions {
  clients: ReportingClientOption[]
}
