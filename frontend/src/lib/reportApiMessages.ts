import {
  OVERFLOW_HOURS_MESSAGE,
  ROW_OUTSIDE_WINDOW_MESSAGE,
  ROW_ZERO_LENGTH_MESSAGE,
  ROWS_OVERLAP_MESSAGE,
} from '../components/ManualReport.schema'

export const HOURS_NOT_ALLOWED_MESSAGE = 'פרויקט זה מדווח כניסה/יציאה, ולכן לא ניתן לשמור עליו סך שעות'
export const HOURS_REQUIRED_MESSAGE = 'פרויקט זה מדווח סך שעות, ולכן יש למלא שעות'
export const TIMES_NOT_ALLOWED_MESSAGE = 'פרויקט זה מדווח סך שעות, ולכן לא ניתן לשמור עליו שעות כניסה/יציאה'
export const TIMES_REQUIRED_MESSAGE = 'פרויקט זה מדווח כניסה/יציאה, ולכן יש למלא שעת כניסה ושעת יציאה'
export const FORMAT_MISMATCH_MESSAGE = 'הדיווח אינו תואם את סוג הדיווח של הפרויקט'

/**
 * Maps the English field messages the reports API returns onto the Hebrew
 * copy the forms already show. Unknown strings pass through unchanged.
 */
export function translateReportApiMessage(message: string): string {
  if (/invalid uuid/i.test(message)) {
    return 'ערך לא תקין — בחרו שוב מהרשימה'
  }
  if (message.includes('cannot exceed the attendance window')) {
    return OVERFLOW_HOURS_MESSAGE
  }
  if (message.includes('clocked over the same stretch of time')) {
    return ROWS_OVERLAP_MESSAGE
  }
  if (message.includes('inside the day attendance window')) {
    return ROW_OUTSIDE_WINDOW_MESSAGE
  }
  if (message.includes('later than its start time')) {
    return ROW_ZERO_LENGTH_MESSAGE
  }
  if (message.includes('cannot carry hours')) {
    return HOURS_NOT_ALLOWED_MESSAGE
  }
  if (message.includes('so hours are required')) {
    return HOURS_REQUIRED_MESSAGE
  }
  if (message.includes('cannot carry row times')) {
    return TIMES_NOT_ALLOWED_MESSAGE
  }
  if (message.includes('both row times are required')) {
    return TIMES_REQUIRED_MESSAGE
  }
  if (message.includes('does not match its project reporting format')) {
    return FORMAT_MISMATCH_MESSAGE
  }
  return message
}
