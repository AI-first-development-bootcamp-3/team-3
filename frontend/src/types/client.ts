import type { Id } from './common'

export interface Client {
  id: Id
  name: string
  contactDetails?: string
  active: boolean
}
