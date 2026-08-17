import type { Id, ISODateString } from './common'

export type AbsenceType = 'VACATION' | 'SICK' | 'RESERVE_DUTY' | 'OTHER'

/** As returned by `POST /absences`. */
export interface Absence {
  id: Id
  userId: Id
  type: AbsenceType
  startDate: ISODateString
  endDate: ISODateString
  halfDay: boolean
  workingDaysCount: number
}

/** As sent to `POST /absences`. `endDate` omitted defaults server-side to `startDate`. */
export interface CreateAbsenceInput {
  type: AbsenceType
  startDate: ISODateString
  endDate?: ISODateString
  halfDay?: boolean
}