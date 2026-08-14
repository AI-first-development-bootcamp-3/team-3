import type { Id } from './common'

export interface Project {
  id: Id
  name: string
  clientId: Id
  active: boolean
}
