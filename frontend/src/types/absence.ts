import type { Id, ISODateString } from './common'

export type AbsenceType = 'vacation' | 'sick' | 'reserve_duty' | 'other'

export interface Absence {
  id: Id
  userId: Id
  type: AbsenceType
  startDate: ISODateString
  endDate: ISODateString
  halfDay: boolean
  missingDocument: boolean
  cancelled: boolean
}
