/**
 * The fixed status labels for a calendar day, shared by the three places that
 * show one: the פירוט יומי row pills, the day panel header, and the list filter.
 *
 * Absence days are not here — their label comes from `ABSENCE_TYPE_LABELS`, one
 * per type. `full` and `partial` days render an hours label (`9 שעות`) on the
 * row but these fixed labels in the panel header and the filter.
 */
export const DAY_STATUS_LABELS = {
  missing: 'חסר',
  full: 'מלא',
  partial: 'חלקי',
  weekend: 'סופ״ש',
} as const
