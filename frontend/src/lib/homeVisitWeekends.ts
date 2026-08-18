import { addCalendarDays, monthStartIso, weekendDatesInclusive } from './workingDays'

const lastVisitKey = (userId: string) => `home-last-visit:${userId}`
const weekendDaysKey = (userId: string) => `home-weekend-days:${userId}`

function readJsonArray(storage: Storage, key: string): string[] {
  try {
    const raw = storage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

/** Persist Fri/Sat that elapsed since the previous visit; first visit starts at this month's 1st. */
export function rememberVisitWeekends(userId: string, today: string, storage: Storage = window.localStorage): string[] {
  const last = storage.getItem(lastVisitKey(userId))
  const stored = readJsonArray(storage, weekendDaysKey(userId))
  const from = last ? addCalendarDays(last, 1) : monthStartIso(today)
  const merged = [...new Set([...stored, ...weekendDatesInclusive(from, today)])].sort()
  storage.setItem(weekendDaysKey(userId), JSON.stringify(merged))
  storage.setItem(lastVisitKey(userId), today)
  return merged
}
