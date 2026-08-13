import type { Id, ISODateString } from './common'

/**
 * PROVISIONAL - SCRUM-6 (hours reporting epic) hasn't been decomposed yet.
 * This shape is a best-effort guess to unblock the API client (SCRUM-20);
 * expect it to change once SCRUM-6 lands.
 */
export interface Report {
  id: Id
  userId: Id
  taskId: Id
  date: ISODateString
  hours: number
  notes?: string
}
