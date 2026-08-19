import { ABSENCE_TYPE_LABELS, HALF_DAY_VACATION_LABEL } from '../components/AbsenceReport.schema'
import { attendanceWindowHours } from '../components/ManualReport.schema'
import tagBuilding from '../assets/home/tag-building.svg'
import tagNote from '../assets/home/tag-note.svg'
import { DAY_STATUS_LABELS } from '../lib/dayStatusLabels'
import { isHalfDayVacation, workHoursTarget } from '../lib/halfDay'
import { expandWorkingDayIsos, monthEndIso, weekendDatesInclusive } from '../lib/workingDays'
import dayjs from '../services/dayjs'
import type { Absence, TimeReportListItem, WorkLocation } from '../types'
import type { DemoStatusTone, DemoDay } from './homeDemoData'

const STANDARD_HOURS = 9

const LOCATION_LABELS: Record<WorkLocation, string> = {
  OFFICE: 'מהמשרד',
  CLIENT: 'מהלקוח',
  HOME: 'מהבית',
}

function formatHoursLabel(value: number): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return `${text} שעות`
}

function projectCountLabel(count: number): string {
  return count === 1 ? '1 פרויקט מדווח' : `${count} פרויקטים מדווחים`
}

function isWeekend(isoDate: string): boolean {
  const weekday = dayjs(isoDate).day()
  return weekday === 5 || weekday === 6
}

function hoursShortOfWindow(allocated: number, windowHours: number): boolean {
  return windowHours > 0 && allocated + 0.1 <= windowHours + 1e-9
}

function monthPrefix(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function weekendDatesForVisibleMonth(
  year: number,
  month: number,
  today: string,
  remembered: string[] = [],
): string[] {
  const start = `${monthPrefix(year, month)}-01`
  const end = monthEndIso(year, month)
  const cap = today < end ? today : end
  return [...new Set([...weekendDatesInclusive(start, cap), ...remembered.filter((date) => date.startsWith(monthPrefix(year, month)))])].sort()
}

function hoursDay(isoDate: string, rows: TimeReportListItem[], halfVacation: boolean): DemoDay {
  const weekend = isWeekend(isoDate)
  const first = rows[0]
  const windowHours = workHoursTarget(
    first ? attendanceWindowHours(first.startTime, first.endTime) : 0,
    halfVacation,
  )
  const allocatedHours = rows.reduce((sum, row) => sum + row.hours, 0)
  const projectIds = new Set(rows.map((row) => row.projectId))
  const locations = [...new Set(rows.map((row) => row.workLocation))]
  let tone: DemoStatusTone
  let status: string
  if (weekend) {
    tone = 'weekend'
    status = DAY_STATUS_LABELS.weekend
  } else if (hoursShortOfWindow(allocatedHours, windowHours)) {
    tone = 'missing'
    status = DAY_STATUS_LABELS.missing
  } else if (halfVacation || windowHours >= STANDARD_HOURS) {
    tone = 'full'
    status = formatHoursLabel(windowHours)
  } else if (windowHours > 0) {
    tone = 'partial'
    status = formatHoursLabel(windowHours)
  } else {
    tone = 'missing'
    status = DAY_STATUS_LABELS.missing
  }

  return {
    isoDate,
    date: dayjs(isoDate).format('DD/MM/YY, ddd'),
    tone,
    status,
    tags: [
      ...locations.map((location) => ({
        text: LOCATION_LABELS[location],
        icon: tagBuilding,
      })),
      ...(projectIds.size > 0 ? [{ text: projectCountLabel(projectIds.size), icon: tagNote }] : []),
      ...(halfVacation ? [{ text: HALF_DAY_VACATION_LABEL, icon: tagNote }] : []),
    ],
    weekend: weekend || undefined,
  }
}

function absenceDay(isoDate: string, type: Absence['type'], halfDay: boolean): DemoDay {
  return {
    isoDate,
    date: dayjs(isoDate).format('DD/MM/YY, ddd'),
    tone: 'absence',
    status: halfDay && type === 'VACATION' ? HALF_DAY_VACATION_LABEL : ABSENCE_TYPE_LABELS[type],
    tags: [],
    absenceType: type,
  }
}

function weekendDay(isoDate: string): DemoDay {
  return {
    isoDate,
    date: dayjs(isoDate).format('DD/MM/YY, ddd'),
    tone: 'weekend',
    status: DAY_STATUS_LABELS.weekend,
    tags: [],
    weekend: true,
  }
}

export function buildHomeDays(input: {
  reports?: TimeReportListItem[]
  absences?: Absence[]
  weekendDates?: string[]
  monthPrefix?: string
}): DemoDay[] {
  const reports = input.reports ?? []
  const byDate = new Map<string, TimeReportListItem[]>()
  for (const report of reports) {
    const bucket = byDate.get(report.date) ?? []
    bucket.push(report)
    byDate.set(report.date, bucket)
  }

  const inMonth = (isoDate: string) => !input.monthPrefix || isoDate.startsWith(input.monthPrefix)

  const absenceByDate = new Map<string, Absence>()
  for (const absence of input.absences ?? []) {
    for (const isoDate of expandWorkingDayIsos(absence.startDate, absence.endDate)) {
      if (!inMonth(isoDate)) continue
      if (!absenceByDate.has(isoDate)) absenceByDate.set(isoDate, absence)
    }
  }

  const dates = new Set<string>([
    ...[...byDate.keys()].filter(inMonth),
    ...absenceByDate.keys(),
    ...(input.weekendDates ?? []).filter(inMonth),
  ])

  return [...dates]
    .sort((left, right) => right.localeCompare(left))
    .map((isoDate) => {
      const rows = byDate.get(isoDate)
      const covering = absenceByDate.get(isoDate)
      if (rows && rows.length > 0) return hoursDay(isoDate, rows, isHalfDayVacation(covering))
      if (covering) return absenceDay(isoDate, covering.type, covering.halfDay)
      return weekendDay(isoDate)
    })
}

/** Collapse raw monthly rows into one home list entry per calendar day. */
export function mapReportsToHomeDays(reports: TimeReportListItem[]): DemoDay[] {
  return buildHomeDays({ reports })
}
