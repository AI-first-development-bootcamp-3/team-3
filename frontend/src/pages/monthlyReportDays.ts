import tagBuilding from '../assets/home/tag-building.svg'
import tagNote from '../assets/home/tag-note.svg'
import dayjs from '../services/dayjs'
import type { TimeReportListItem, WorkLocation } from '../types'
import type { DemoDay, DemoStatusTone } from './homeDemoData'

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

/** Collapse raw monthly rows into one home list entry per calendar day. */
export function mapReportsToHomeDays(reports: TimeReportListItem[]): DemoDay[] {
  const byDate = new Map<string, TimeReportListItem[]>()

  for (const report of reports) {
    const bucket = byDate.get(report.date) ?? []
    bucket.push(report)
    byDate.set(report.date, bucket)
  }

  return [...byDate.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([isoDate, rows]) => {
      const weekend = isWeekend(isoDate)
      const totalHours = rows.reduce((sum, row) => sum + row.durationHours, 0)
      const projectIds = new Set(rows.map((row) => row.projectId))
      const locations = [...new Set(rows.map((row) => row.workLocation))]

      let tone: DemoStatusTone
      let status: string
      if (weekend) {
        tone = 'weekend'
        status = 'סופ״ש'
      } else if (totalHours >= STANDARD_HOURS) {
        tone = 'full'
        status = '9 שעות'
      } else if (totalHours > 0) {
        tone = 'partial'
        status = formatHoursLabel(totalHours)
      } else {
        tone = 'missing'
        status = 'חסר'
      }

      const tags = [
        ...locations.map((location) => ({
          text: LOCATION_LABELS[location],
          icon: tagBuilding,
        })),
        ...(projectIds.size > 0
          ? [{ text: projectCountLabel(projectIds.size), icon: tagNote }]
          : []),
      ]

      return {
        isoDate,
        date: dayjs(isoDate).format('DD/MM/YY, ddd'),
        tone,
        status,
        tags,
        weekend: weekend || undefined,
      }
    })
}
