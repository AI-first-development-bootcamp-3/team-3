import type { Id } from './common'

export type TaskStatus = 'open' | 'closed'

export interface Task {
  id: Id
  name: string
  description?: string
  projectId: Id
  status: TaskStatus
}
