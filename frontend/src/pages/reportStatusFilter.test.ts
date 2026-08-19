import { describe, expect, it } from 'vitest'
import { ABSENCE_TYPE_LABELS } from '../components/AbsenceReport.schema'
import { DAY_STATUS_LABELS } from '../lib/dayStatusLabels'
import type { AbsenceType } from '../types'
import type { DemoDay } from './homeDemoData'
import {
  REPORT_STATUS_FILTERS,
  REPORT_STATUS_FILTER_LABELS,
  filterDaysByStatus,
} from './reportStatusFilter'

function day(isoDate: string, tone: DemoDay['tone'], absenceType?: AbsenceType): DemoDay {
  return { isoDate, date: isoDate, tone, status: tone, tags: [], absenceType }
}

const DAYS: DemoDay[] = [
  day('2026-08-17', 'partial'),
  day('2026-08-16', 'full'),
  day('2026-08-15', 'weekend'),
  day('2026-08-14', 'absence', 'SICK'),
  day('2026-08-13', 'missing'),
  day('2026-08-12', 'full'),
  day('2026-08-11', 'absence', 'VACATION'),
  day('2026-08-10', 'absence', 'HOLIDAY'),
]

describe('filterDaysByStatus', () => {
  it('passes everything through in order when nothing is filtered', () => {
    expect(filterDaysByStatus(DAYS, 'all')).toEqual(DAYS)
  })

  it('returns only the rows carrying the chosen status', () => {
    expect(filterDaysByStatus(DAYS, 'missing').map((d) => d.isoDate)).toEqual(['2026-08-13'])
    expect(filterDaysByStatus(DAYS, 'weekend').map((d) => d.isoDate)).toEqual(['2026-08-15'])
  })

  it('separates absence days by type rather than lumping them together', () => {
    expect(filterDaysByStatus(DAYS, 'SICK').map((d) => d.isoDate)).toEqual(['2026-08-14'])
    expect(filterDaysByStatus(DAYS, 'VACATION').map((d) => d.isoDate)).toEqual(['2026-08-11'])
    expect(filterDaysByStatus(DAYS, 'HOLIDAY').map((d) => d.isoDate)).toEqual(['2026-08-10'])
    expect(filterDaysByStatus(DAYS, 'RESERVE_DUTY')).toEqual([])
    expect(filterDaysByStatus(DAYS, 'OTHER')).toEqual([])
  })

  it('never mixes absence or weekend rows into חסר', () => {
    const tones = filterDaysByStatus(DAYS, 'missing').map((d) => d.tone)
    expect(tones).not.toContain('absence')
    expect(tones).not.toContain('weekend')
  })

  it('separates reported days by how complete they are', () => {
    expect(filterDaysByStatus(DAYS, 'full').map((d) => d.isoDate)).toEqual([
      '2026-08-16',
      '2026-08-12',
    ])
    expect(filterDaysByStatus(DAYS, 'partial').map((d) => d.isoDate)).toEqual(['2026-08-17'])
  })

  it('gives every choice a disjoint set of rows', () => {
    const seen = new Set<string>()
    for (const value of REPORT_STATUS_FILTERS) {
      if (value === 'all') continue
      for (const row of filterDaysByStatus(DAYS, value)) {
        expect(seen.has(row.isoDate)).toBe(false)
        seen.add(row.isoDate)
      }
    }
    // Between them the choices account for the whole month.
    expect(seen.size).toBe(DAYS.length)
  })

  it('returns nothing when no row matches', () => {
    expect(filterDaysByStatus([day('2026-08-13', 'missing')], 'SICK')).toEqual([])
    expect(filterDaysByStatus([], 'all')).toEqual([])
  })

  it('does not alter the rows it keeps', () => {
    const rows = filterDaysByStatus(DAYS, 'missing')
    expect(rows[0]).toBe(DAYS[4])
  })

  it('offers only labels the product already shows, none of them restated', () => {
    expect(REPORT_STATUS_FILTERS).toEqual([
      'all',
      'missing',
      'full',
      'partial',
      'weekend',
      'VACATION',
      'SICK',
      'RESERVE_DUTY',
      'OTHER',
      'HOLIDAY',
    ])
    expect(REPORT_STATUS_FILTER_LABELS.all).toBe('כל הדיווחים')
    // Both label sets are reused from their source, so they cannot drift from
    // the day pills and the panel header they mirror.
    for (const [tone, label] of Object.entries(DAY_STATUS_LABELS)) {
      expect(REPORT_STATUS_FILTER_LABELS[tone as keyof typeof DAY_STATUS_LABELS]).toBe(label)
    }
    for (const [type, label] of Object.entries(ABSENCE_TYPE_LABELS)) {
      expect(REPORT_STATUS_FILTER_LABELS[type as AbsenceType]).toBe(label)
    }
  })
})
