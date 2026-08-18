import type { Id, ISODateString } from './common'

export type WorkLocation = 'OFFICE' | 'CLIENT' | 'HOME'

/** How a project collects its time: a typed total, or a clock pair per row. */
export type ReportFormat = 'SUM_HOURS' | 'CLOCK_IN_OUT'

export interface Report {
  id: Id
  userId: Id
  clientId: Id
  projectId: Id
  taskId: Id
  date: ISODateString
  workLocation: WorkLocation
  /** The day attendance window, copied onto every row of the day. */
  startTime: string
  endTime: string
  hours: number
  /** The row's own clock pair — only a `CLOCK_IN_OUT` project has one. */
  rowStartTime?: string | null
  rowEndTime?: string | null
  description: string
}

/**
 * The time fields one row carries, following its project's `reportFormat`:
 * typed `hours` for `SUM_HOURS`, a clock pair for `CLOCK_IN_OUT`. Never both —
 * the API rejects a row carrying the other format's fields.
 */
export type ReportRowTimeFields = { hours: number } | { rowStartTime: string; rowEndTime: string }

/** One project row of a day, as sent to `POST /reports/batch`. */
export type ReportRowInput = Omit<
  Report,
  'id' | 'userId' | 'date' | 'startTime' | 'endTime' | 'hours' | 'rowStartTime' | 'rowEndTime'
> &
  ReportRowTimeFields

export interface CreateReportBatchInput {
  date: ISODateString
  startTime: string
  endTime: string
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
  /** Decides which time inputs the entry form renders for this project. */
  reportFormat: ReportFormat
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
