import { ABSENCE_TYPES, ABSENCE_TYPE_LABELS } from '../components/AbsenceReport.schema'
import { DAY_STATUS_LABELS } from '../lib/dayStatusLabels'
import type { AbsenceType } from '../types'
import type { DemoDay } from './homeDemoData'

/**
 * Every choice is a status label the product already shows for that kind of day,
 * so the menu invents no copy. `חסר`, `מלא`, `חלקי`, and `סופ״ש` come from
 * `DAY_STATUS_LABELS` and the absence labels from `ABSENCE_TYPE_LABELS`; none is
 * restated here, so the filter cannot drift from the pills it filters.
 *
 * Absence days are split by type, which `tone` alone cannot express — all four
 * share `tone: 'absence'` — so those values carry the `AbsenceType` instead. The
 * two unions do not overlap.
 */
export type ReportStatusFilter = 'all' | 'missing' | 'full' | 'partial' | 'weekend' | AbsenceType

/** Menu order, default first: work days by how complete they are, then non-work days. */
export const REPORT_STATUS_FILTERS: readonly ReportStatusFilter[] = [
  'all',
  'missing',
  'full',
  'partial',
  'weekend',
  ...ABSENCE_TYPES,
]

export const REPORT_STATUS_FILTER_LABELS: Record<ReportStatusFilter, string> = {
  all: 'כל הדיווחים',
  ...DAY_STATUS_LABELS,
  ...ABSENCE_TYPE_LABELS,
}

/**
 * Picks which day rows to show. Rows are passed through untouched — a surviving
 * row renders exactly as it does unfiltered, never recomputed from a subset of
 * its reports.
 */
export function filterDaysByStatus(days: DemoDay[], filter: ReportStatusFilter): DemoDay[] {
  if (filter === 'all') return days
  if (filter in DAY_STATUS_LABELS) {
    return days.filter((day) => day.tone === filter)
  }
  return days.filter((day) => day.tone === 'absence' && day.absenceType === filter)
}
