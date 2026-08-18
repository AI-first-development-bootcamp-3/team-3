/**
 * Local preview fixtures for the hours home.
 *
 * KPI and monthly-list APIs are still stubbed in demo mode. These rows exist only so we can eyeball
 * every badge tone during development. They are not a copy of the Figma sample numbers.
 * Gated behind `?demo=1` in a dev build; MUST NOT ship as the source of dashboard numbers.
 */
import tagAlertRed from '../assets/home/tag-alert-red.svg'
import tagAlertOrange from '../assets/home/tag-alert-orange.svg'
import tagCheckGreen from '../assets/home/tag-check-green.svg'
import tagCloseBlue from '../assets/home/tag-close-blue.svg'
import tagBuilding from '../assets/home/tag-building.svg'
import tagNote from '../assets/home/tag-note.svg'
import dayJobs from '../assets/home/day-jobs.svg'
import dayWeekend from '../assets/home/day-weekend.svg'
import type { AbsenceType } from '../types'

export type DemoStatusTone = 'missing' | 'full' | 'partial' | 'weekend' | 'absence'

export type DemoTag = { text: string; icon: string }

export type DemoDay = {
  isoDate: string
  date: string
  tone: DemoStatusTone
  status: string
  tags: DemoTag[]
  weekend?: boolean
  /** Set on `absence` rows so the day list can be filtered by type without
   * matching on the display label. */
  absenceType?: AbsenceType
}

export const DEMO_MONTH = '2026-08-01'

export const DEMO_STATUS_ICONS: Record<DemoStatusTone, string> = {
  missing: tagAlertRed,
  full: tagCheckGreen,
  partial: tagAlertOrange,
  weekend: tagCloseBlue,
  absence: tagCloseBlue,
}

export const DEMO_KPIS: Record<string, { value: string; caption: string }> = {
  'שעות חודשיות': { value: '96', caption: 'מתוך 162' },
  'ימי חופשה': { value: '1', caption: 'נוצלו החודש' },
  'ימי מחלה': { value: '3', caption: 'נוצלו החודש' },
  'דיווחים חסרים': { value: '2', caption: 'דיווחים שצריך לתת מענה' },
  'פרויקטים מדווחים': { value: '6', caption: 'פרויקטים מדווחים החודש' },
}

export const DEMO_DAY_ICONS = { workday: dayJobs, weekend: dayWeekend }

export const DEMO_DAYS: DemoDay[] = [
  {
    isoDate: '2026-08-17',
    date: '17/08/26, יום ב׳',
    tone: 'partial',
    status: '5.5 שעות',
    tags: [
      { text: 'מהבית', icon: tagBuilding },
      { text: '4 פרויקטים מדווחים', icon: tagNote },
    ],
  },
  {
    isoDate: '2026-08-16',
    date: '16/08/26, יום א׳',
    tone: 'full',
    status: '9 שעות',
    tags: [
      { text: 'מהלקוח', icon: tagBuilding },
      { text: '1 פרויקט מדווח', icon: tagNote },
    ],
  },
  { isoDate: '2026-08-15', date: '15/08/26, יום ש׳', tone: 'weekend', status: 'סופ״ש', tags: [], weekend: true },
  { isoDate: '2026-08-14', date: '14/08/26, יום ו׳', tone: 'weekend', status: 'סופ״ש', tags: [], weekend: true },
  {
    isoDate: '2026-08-13',
    date: '13/08/26, יום ה׳',
    tone: 'missing',
    status: 'חסר',
    tags: [{ text: '3 מקומות עבודה', icon: tagBuilding }],
  },
  {
    isoDate: '2026-08-12',
    date: '12/08/26, יום ד׳',
    tone: 'full',
    status: '9 שעות',
    tags: [
      { text: 'מהמשרד', icon: tagBuilding },
      { text: '2 פרויקטים מדווחים', icon: tagNote },
    ],
  },
  {
    isoDate: '2026-08-11',
    date: '11/08/26, יום ג׳',
    tone: 'partial',
    status: '4 שעות',
    tags: [
      { text: 'מהלקוח', icon: tagBuilding },
      { text: 'מהבית', icon: tagBuilding },
    ],
  },
  {
    isoDate: '2026-08-10',
    date: '10/08/26, יום ב׳',
    tone: 'missing',
    status: 'חסר',
    tags: [
      { text: 'מהמשרד', icon: tagBuilding },
      { text: '5 פרויקטים מדווחים', icon: tagNote },
    ],
  },
]

export function isHomeDemo(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('demo') === '1'
}
