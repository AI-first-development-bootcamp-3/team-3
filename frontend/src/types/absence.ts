import type { Id, ISODateString } from './common'

export type AbsenceType = 'VACATION' | 'SICK' | 'RESERVE_DUTY' | 'OTHER'

export interface AbsenceAttachment {
  id: Id
  filename: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
}

export interface Absence {
  id: Id
  userId: Id
  type: AbsenceType
  startDate: ISODateString
  endDate: ISODateString
  halfDay: boolean
  workingDayCount: number
  attachments: AbsenceAttachment[]
}

export interface CreateAbsenceInput {
  type: AbsenceType
  startDate: ISODateString
  endDate?: ISODateString
  attachmentIds?: string[]
}
