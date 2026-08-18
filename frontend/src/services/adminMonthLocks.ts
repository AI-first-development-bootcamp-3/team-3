import { request } from './apiClient'

export interface AdminMonthLock {
  year: number
  month: number
  lockedAt: string
  lockedById: string
}

export async function listMonthLocks(year: number): Promise<AdminMonthLock[]> {
  const { locks } = await request<{ locks: AdminMonthLock[] }>(`/admin/month-locks?year=${year}`)
  return locks
}

export async function lockMonth(year: number, month: number): Promise<AdminMonthLock> {
  const { lock } = await request<{ lock: AdminMonthLock }>('/admin/month-locks', {
    method: 'POST',
    body: { year, month },
  })
  return lock
}

export async function unlockMonth(year: number, month: number): Promise<void> {
  await request<undefined>(`/admin/month-locks/${year}/${month}`, { method: 'DELETE' })
}
