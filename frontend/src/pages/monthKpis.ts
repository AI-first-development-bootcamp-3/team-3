import { attendanceWindowHours } from '../components/ManualReport.schema'
import { expandWorkingDayIsos, monthEndIso } from '../lib/workingDays'
import type { Absence, TimeReportListItem } from '../types'
import type { DEMO_KPIS } from './homeDemoData'

const MONTHLY_HOURS_TARGET = 180

export type MonthKpiCard = { value: string; caption: string }

export type MonthKpis = Record<keyof typeof DEMO_KPIS, MonthKpiCard>

function formatHours(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function monthPrefix(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function hoursMatchWindow(allocated: number, windowHours: number): boolean {
  return windowHours > 0 && Math.abs(allocated - windowHours) < 0.1
}

function dueEndIso(year: number, month: number, today: string): string {
  const end = monthEndIso(year, month)
  const start = `${monthPrefix(year, month)}-01`
  if (today < start) return addDays(start, -1)
  return today < end ? today : end
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const cursor = new Date(year, month - 1, day + days)
  return `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
}

function workingDaysDue(year: number, month: number, today: string): string[] {
  const start = `${monthPrefix(year, month)}-01`
  const end = dueEndIso(year, month, today)
  return expandWorkingDayIsos(start, end)
}

function absenceDaysInMonth(absences: Absence[], prefix: string, type?: Absence['type']): Set<string> {
  const days = new Set<string>()
  for (const absence of absences) {
    if (type && absence.type !== type) continue
    for (const isoDate of expandWorkingDayIsos(absence.startDate, absence.endDate)) {
      if (isoDate.startsWith(prefix)) days.add(isoDate)
    }
  }
  return days
}

function reportsByDate(reports: TimeReportListItem[]): Map<string, TimeReportListItem[]> {
  const byDate = new Map<string, TimeReportListItem[]>()
  for (const report of reports) {
    const bucket = byDate.get(report.date) ?? []
    bucket.push(report)
    byDate.set(report.date, bucket)
  }
  return byDate
}

function dayIsMissing(rows: TimeReportListItem[] | undefined): boolean {
  if (!rows || rows.length === 0) return true
  const first = rows[0]
  const windowHours = first ? attendanceWindowHours(first.startTime, first.endTime) : 0
  const allocated = rows.reduce((sum, row) => sum + Number(row.hours || 0), 0)
  return !hoursMatchWindow(allocated, windowHours)
}

export function buildMonthKpis(input: {
  reports: TimeReportListItem[]
  absences: Absence[]
  year: number
  month: number
  today: string
}): MonthKpis {
  const prefix = monthPrefix(input.year, input.month)
  const dueDays = workingDaysDue(input.year, input.month, input.today)
  const vacationDays = absenceDaysInMonth(input.absences, prefix, 'VACATION')
  const sickDays = absenceDaysInMonth(input.absences, prefix, 'SICK')
  const absenceDays = absenceDaysInMonth(input.absences, prefix)
  const byDate = reportsByDate(input.reports)

  const reportedHours = input.reports.reduce((sum, row) => sum + Number(row.hours || 0), 0)

  let missing = 0
  for (const isoDate of dueDays) {
    if (absenceDays.has(isoDate)) continue
    if (dayIsMissing(byDate.get(isoDate))) missing += 1
  }

  const projectIds = new Set(input.reports.map((row) => row.projectId).filter(Boolean))

  return {
    'שעות חודשיות': { value: formatHours(reportedHours), caption: `מתוך ${MONTHLY_HOURS_TARGET}` },
    'ימי חופשה': { value: String(vacationDays.size), caption: 'נוצלו החודש' },
    'ימי מחלה': { value: String(sickDays.size), caption: 'נוצלו החודש' },
    'דיווחים חסרים': { value: String(missing), caption: 'דיווחים שצריך לתת מענה' },
    'פרויקטים מדווחים': { value: String(projectIds.size), caption: 'פרויקטים מדווחים החודש' },
  }
}
