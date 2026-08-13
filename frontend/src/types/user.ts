import type { Id } from './common'

export type UserType = 'regular' | 'admin'

export interface User {
  id: Id
  fullName: string
  email: string
  userType: UserType
  active: boolean
}
