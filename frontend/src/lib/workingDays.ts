const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function parseCalendarDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Inclusive Sunday–Thursday ISO dates. Friday and Saturday are skipped. */
export function expandWorkingDayIsos(startDate: string, endDate: string): string[] {
  if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate) || endDate < startDate) return []
  const cursor = parseCalendarDate(startDate)
  const last = parseCalendarDate(endDate)
  const days: string[] = []
  while (cursor.getTime() <= last.getTime()) {
    const weekday = cursor.getDay()
    if (weekday !== 5 && weekday !== 6) {
      const year = cursor.getFullYear()
      const month = String(cursor.getMonth() + 1).padStart(2, '0')
      const day = String(cursor.getDate()).padStart(2, '0')
      days.push(`${year}-${month}-${day}`)
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function countWorkingDays(startDate: string, endDate: string): number {
  return expandWorkingDayIsos(startDate, endDate).length
}

/** Inclusive Friday and Saturday dates in [from, to]. */
export function weekendDatesInclusive(from: string, to: string): string[] {
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || to < from) return []
  const cursor = parseCalendarDate(from)
  const last = parseCalendarDate(to)
  const days: string[] = []
  while (cursor.getTime() <= last.getTime()) {
    const weekday = cursor.getDay()
    if (weekday === 5 || weekday === 6) {
      const year = cursor.getFullYear()
      const month = String(cursor.getMonth() + 1).padStart(2, '0')
      const day = String(cursor.getDate()).padStart(2, '0')
      days.push(`${year}-${month}-${day}`)
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function addCalendarDays(isoDate: string, days: number): string {
  const cursor = parseCalendarDate(isoDate)
  cursor.setDate(cursor.getDate() + days)
  const year = cursor.getFullYear()
  const month = String(cursor.getMonth() + 1).padStart(2, '0')
  const day = String(cursor.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function monthStartIso(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`
}

export function monthEndIso(year: number, month: number): string {
  const last = new Date(year, month, 0)
  const day = String(last.getDate()).padStart(2, '0')
  return `${year}-${String(month).padStart(2, '0')}-${day}`
}
