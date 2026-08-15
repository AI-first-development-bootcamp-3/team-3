import type { Id } from './common'

export type UserType = 'regular' | 'admin'

export interface User {
  id: Id
  fullName: string
  email: string
  userType: UserType
  active: boolean
  /** True until the user sets their own password for the first time (SCRUM-209). Absent on older stored sessions. */
  mustChangePassword?: boolean
}
