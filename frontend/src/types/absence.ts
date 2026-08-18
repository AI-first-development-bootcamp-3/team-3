import type { Id, ISODateString } from './common'

export type AbsenceType = 'VACATION' | 'SICK' | 'RESERVE_DUTY' | 'OTHER'

export interface Absence {
  id: Id
  userId: Id
  type: AbsenceType
  startDate: ISODateString
  endDate: ISODateString
  halfDay: boolean
  workingDayCount: number
}

export interface CreateAbsenceInput {
  type: AbsenceType
  startDate: ISODateString
  endDate?: ISODateString
  attachmentIds?: string[]
}
