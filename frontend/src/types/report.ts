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
