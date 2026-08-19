import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch, type FieldErrors, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { App } from 'antd'
import { ApiError } from '../services/apiClient'
import dayjs from '../services/dayjs'
import { deleteAbsence } from '../services/absences'
import { createReportBatch, deleteReportsForDate, getReportingOptions, toReportRow } from '../services/reports'
import type {
  Absence,
  CreateReportBatchInput,
  CreateReportBatchResult,
  ReportingOptions,
  TimeReportListItem,
  WorkLocation,
} from '../types'
import { translateReportApiMessage } from '../lib/reportApiMessages'
import {
  attendanceWindowHours,
  buildManualReportSchema,
  hoursExceedWindow,
  OVERFLOW_HOURS_MESSAGE,
  UNDERFILL_HOURS_MESSAGE,
  overflowHours,
  projectFormat,
  rowAllocatedHours,
  rowFormat,
  ROW_OUTSIDE_WINDOW_MESSAGE,
  ROW_ZERO_LENGTH_MESSAGE,
  ROWS_OVERLAP_MESSAGE,
  type ManualReportValues,
  type ProjectRowValues,
} from './ManualReport.schema'
import AbsenceReportForm from './AbsenceReportForm'
import ManualReportDeleteDialog from './ManualReportDeleteDialog'
import ManualReportProjectCard, { type RowErrors } from './ManualReportProjectCard'
import addCircleBlue from '../assets/manual-report/desktop/add-circle-blue.svg'
import calendarJobs from '../assets/manual-report/desktop/calendar-jobs.svg'
import clockLinear from '../assets/manual-report/desktop/clock-linear.svg'
import closeCircle from '../assets/manual-report/desktop/close-circle.svg'
import infoCircle from '../assets/manual-report/desktop/info-circle.svg'
import messageEdit from '../assets/manual-report/desktop/message-edit.svg'
import scheduleGreen from '../assets/manual-report/desktop/schedule-green.svg'
import sectionChevron from '../assets/manual-report/desktop/section-chevron.svg'
import trashIcon from '../assets/manual-report/desktop/trash.svg'
import cactusIllustration from '../assets/manual-report/desktop/cactus-illustration.svg'
import { isHalfDayVacation, STANDARD_DAY_HOURS, workHoursTarget } from '../lib/halfDay'
import './ManualReport.css'

const STANDARD_HOURS = STANDARD_DAY_HOURS

const MISSING_DETAILS = {
  title: 'חסר לנו פרט או שניים',
  detail: 'מלא את כל הנתונים הדרושים כדי שנוכל לשמור את הדיווח בהצלחה.',
}
const UNDERFILL = {
  title: 'חסרות שעות בפרויקטים',
  detail: 'יש לחלק את כל שעות חלון הכניסה–יציאה לפרויקטים לפני השמירה.',
}
const ZERO_HOURS = {
  title: 'שעות לא תקינות',
  detail: 'יש להזין מספר בין 0.5 ל-24, עם לכל היותר ספרה אחת אחרי הנקודה.',
}
const ROW_TIMES_OUTSIDE = {
  title: 'שעות הפרויקט מחוץ לחלון היום',
  detail: 'שעות הכניסה והיציאה של כל פרויקט חייבות להיות בתוך חלון הכניסה–יציאה של היום.',
}
const ROW_TIMES_OVERLAP = {
  title: 'יש חפיפה בין הפרויקטים',
  detail: 'לא ניתן לדווח שני פרויקטים על אותו פרק זמן. עדכנו את שעות הכניסה והיציאה של הפרויקטים המסומנים.',
}
const EMPTY_TREE = {
  title: 'אין פרויקטים לדיווח',
  detail: 'עדיין לא שויכו לכם פרויקטים. פנו למנהל ישיר כדי שישייך אתכם לפרויקט.',
}
/** The projects area when the employee has no assignment at all — not a fault,
 * just nobody has put them on a project yet. */
const NO_ASSIGNED_PROJECTS = {
  title: 'עדיין לא שויכו לכם פרויקטים',
  hint: 'כדי לדווח שעות צריך שיוך לפרויקט. פנו למנהל ישיר ואפשר יהיה להתחיל לדווח.',
  short: 'עדיין לא שויכו לכם פרויקטים לדיווח. פנו למנהל ישיר.',
}
const TOO_MANY_SAVES = {
  title: 'שמרתם יותר מדי פעמים ברצף',
  detail: 'המתינו כמה דקות ונסו לשמור את הדיווח שוב.',
}
const MONTH_LOCKED = {
  title: 'החודש נעול',
  detail: 'לא ניתן לדווח או למחוק דיווחים בחודש נעול. פנו למנהל המערכת.',
}
const SAVE_FAILED = {
  title: 'משהו השתבש. נסו שוב.',
  detail: 'לא הצלחנו לשמור את הדיווח. בדקו את החיבור ונסו שוב.',
}

export type ManualReportHeaderTone = 'missing' | 'full' | 'partial' | 'weekend' | 'absence'

export type ManualReportHeaderTag = { text: string; icon?: string }

export type ManualReportHeaderMeta = {
  status: string
  tone: ManualReportHeaderTone
  tags: ManualReportHeaderTag[]
  holiday?: boolean
}

interface Props {
  onClose: () => void
  onSaved?: () => void
  initialDate?: string
  initialReports?: TimeReportListItem[]
  initialAbsences?: Absence[]
  /** Kept for callers that still pass day-row status; not shown in the panel. */
  headerMeta?: ManualReportHeaderMeta
  /** Hide the absence tab when an admin is correcting hours for someone else. */
  allowAbsenceTab?: boolean
  loadOptions?: () => Promise<ReportingOptions>
  saveBatch?: (body: CreateReportBatchInput) => Promise<CreateReportBatchResult>
  deleteDay?: (date: string) => Promise<void>
}

function emptyRow(): ProjectRowValues {
  return {
    clientId: '',
    projectId: '',
    taskId: '',
    workLocation: '',
    hours: 0,
    rowStartTime: '',
    rowEndTime: '',
    description: '',
  }
}

function valuesFromReports(date: string, reports: TimeReportListItem[]): ManualReportValues {
  const first = reports[0]
  return {
    date,
    dayStart: first?.startTime || '09:00',
    dayEnd: first?.endTime || '18:00',
    rows: reports.map((report) => ({
      clientId: report.clientId,
      projectId: report.projectId,
      taskId: report.taskId,
      workLocation: report.workLocation,
      hours: Number(report.hours ?? report.durationHours) || 0,
      rowStartTime: report.rowStartTime ?? '',
      rowEndTime: report.rowEndTime ?? '',
      // A stored clock pair is what marks a row as כניסה/יציאה, so the saved
      // row keeps that format even if its project has since been switched.
      savedFormat: report.rowStartTime ? 'CLOCK_IN_OUT' : 'SUM_HOURS',
      description: report.description ?? '',
    })),
  }
}

function freshDay(date?: string, reports?: TimeReportListItem[]): ManualReportValues {
  const day = date ? dayjs(date) : dayjs()
  const iso = day.isValid() ? day.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
  if (reports && reports.length > 0) return valuesFromReports(iso, reports)
  return {
    date: iso,
    dayStart: '09:00',
    dayEnd: '18:00',
    rows: [],
  }
}

function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatDayTitle(date: string): string {
  const day = dayjs(date)
  return day.isValid() ? `${day.format('DD/MM/YY')}, ${day.format('dddd')}` : ''
}

function formatTotalHoursLabel(hours: number): string {
  if (hours <= 0) return '0 שעות'
  return Number.isInteger(hours) ? `${hours} שעות` : `${hours.toFixed(1)} שעות`
}

function apiFieldErrors(body: unknown): { field: string; message: string }[] {
  if (!body || typeof body !== 'object' || !('error' in body)) return []
  const error = (body as { error?: { details?: { field?: string; message?: string }[] } }).error
  return (error?.details ?? []).filter(
    (detail): detail is { field: string; message: string } =>
      typeof detail.field === 'string' && typeof detail.message === 'string',
  )
}

function translateApiMessage(message: string): string {
  return translateReportApiMessage(message)
}

function applyApiFieldErrors(
  details: { field: string; message: string }[],
  setError: (name: FieldPath<ManualReportValues>, error: { message: string }) => void,
) {
  for (const detail of details) {
    setError(detail.field as FieldPath<ManualReportValues>, {
      message: translateApiMessage(detail.message),
    })
  }
}

function hoursShortOfWindow(allocated: number, windowHours: number): boolean {
  return windowHours > 0 && allocated + 0.1 <= windowHours + 1e-9
}

function arrayErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const record = error as { message?: unknown; root?: { message?: unknown } }
  if (typeof record.message === 'string' && record.message.length > 0) return record.message
  if (typeof record.root?.message === 'string' && record.root.message.length > 0) return record.root.message
  return undefined
}

function hoursPhrase(value: number): string {
  if (value === 1) return 'שעה אחת'
  if (value === 0.5) return 'חצי שעה'
  return `${formatHours(value)} שעות`
}

function overflowBanner(allocated: number, windowHours: number) {
  const extra = overflowHours(allocated, windowHours)
  const totals = `סכום שעות הפרויקטים הוא ${formatHours(allocated)}, וחלון הכניסה–יציאה הוא ${hoursPhrase(windowHours)}.`
  return {
    title: 'יותר מדי שעות בפרויקטים',
    detail: extra > 0 ? `${totals} יש להפחית ${hoursPhrase(extra)}.` : totals,
  }
}

function halfDayOverTargetBanner(allocated: number, target: number) {
  return {
    title: 'דיווח מעל חצי יום חופשה',
    detail: `ביום זה נלקח חצי יום חופשה, ולכן מספיקות ${hoursPhrase(target)}. אתם מדווחים ${hoursPhrase(allocated)}. לחצו שמירה שוב אם ברצונכם לדווח מעל היעד.`,
  }
}

/** The clock-pair messages the day's cards are carrying, in row order. */
function rowTimeMessages(rowIssues: unknown[]): string[] {
  return rowIssues.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const record = row as { rowStartTime?: { message?: string }; rowEndTime?: { message?: string } }
    return [record.rowStartTime?.message, record.rowEndTime?.message].filter(
      (message): message is string => typeof message === 'string' && message.length > 0,
    )
  })
}

function bannerForInvalid(
  formErrors: FieldErrors<ManualReportValues>,
  allocatedHours: number,
  windowHours: number,
) {
  const rowList = formErrors.rows
  if (arrayErrorMessage(rowList) === OVERFLOW_HOURS_MESSAGE) {
    return overflowBanner(allocatedHours, windowHours)
  }
  if (arrayErrorMessage(rowList) === UNDERFILL_HOURS_MESSAGE) {
    return UNDERFILL
  }
  const rowIssues = Object.entries(rowList ?? {})
    .filter(([key]) => /^\d+$/.test(key))
    .map(([, value]) => value)
  const timeMessages = rowTimeMessages(rowIssues)
  if (timeMessages.includes(ROWS_OVERLAP_MESSAGE)) return ROW_TIMES_OVERLAP
  if (timeMessages.includes(ROW_OUTSIDE_WINDOW_MESSAGE) || timeMessages.includes(ROW_ZERO_LENGTH_MESSAGE)) {
    return ROW_TIMES_OUTSIDE
  }
  const missingPick = rowIssues.some(
    (row) => row && typeof row === 'object' && ('projectId' in row || 'taskId' in row || 'workLocation' in row || 'clientId' in row),
  )
  if (missingPick) return MISSING_DETAILS
  if (rowIssues.some((row) => row && typeof row === 'object' && 'hours' in row)) return ZERO_HOURS
  return MISSING_DETAILS
}

function dayDeleteCopy(absences: Absence[], hasHours: boolean) {
  if (absences.length > 0 && !hasHours) {
    const first = absences[0]
    const range =
      first && first.startDate !== first.endDate
        ? ` כל ימי הטווח (${dayjs(first.startDate).format('D/M')}–${dayjs(first.endDate).format('D/M')}) יימחקו.`
        : ''
    return {
      title: 'למחוק את דיווח ההיעדרות?',
      body: `ההיעדרות תוסר מהחודש.${range} אפשר לדווח מחדש אחר כך.`,
      confirmLabel: 'מחק היעדרות',
    }
  }
  return {
    title: 'למחוק את הדיווח ליום זה?',
    body: 'כל הפרויקטים שדווחו ביום זה יימחקו. אפשר לדווח מחדש אחר כך.',
    confirmLabel: 'מחק את הדיווח',
  }
}

/**
 * Desktop דיווח ידני side panel — Figma frame 1:17385 beside the hours home.
 */
function ManualReport({
  onClose,
  onSaved,
  initialDate,
  initialReports,
  initialAbsences,
  allowAbsenceTab = true,
  loadOptions = getReportingOptions,
  saveBatch = createReportBatch,
  deleteDay = deleteReportsForDate,
}: Props) {
  const { message } = App.useApp()
  const [options, setOptions] = useState<ReportingOptions | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<number | null>(null)
  const [pendingDayDelete, setPendingDayDelete] = useState(false)
  const [hoursOpen, setHoursOpen] = useState(true)
  const [reportTab, setReportTab] = useState<'hours' | 'absence'>(() =>
    (initialAbsences?.length ?? 0) > 0 && (initialReports?.length ?? 0) === 0 ? 'absence' : 'hours',
  )
  const acknowledgedOverHalfDay = useRef<number | null>(null)

  const dayAbsences = initialAbsences ?? []
  const halfVacation = dayAbsences.some(isHalfDayVacation)
  const schema = useMemo(() => buildManualReportSchema(options), [options])

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualReportValues>({
    resolver: zodResolver(schema),
    defaultValues: freshDay(initialDate, initialReports),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'rows' })
  const day = useWatch({ control })
  const rows = useMemo(() => (day.rows ?? []) as ProjectRowValues[], [day.rows])

  useEffect(() => {
    reset(freshDay(initialDate, initialReports))
  }, [initialDate, initialReports, reset])

  useEffect(() => {
    let cancelled = false
    loadOptions()
      .then((tree) => {
        if (!cancelled) setOptions(tree)
      })
      .catch(() => {
        if (!cancelled) setLoadError('לא ניתן לטעון פרויקטים ומשימות. נסו שוב.')
      })
    return () => {
      cancelled = true
    }
  }, [loadOptions])

  const windowHours = useMemo(
    () => attendanceWindowHours(day.dayStart ?? '', day.dayEnd ?? ''),
    [day.dayEnd, day.dayStart],
  )
  const hoursTarget = useMemo(
    () => workHoursTarget(windowHours, halfVacation),
    [halfVacation, windowHours],
  )
  const reported = useMemo(
    () => rows.reduce((total, row) => total + rowAllocatedHours(options, day.dayStart ?? '', row), 0),
    [options, day.dayStart, rows],
  )
  const remaining = Math.max(hoursTarget - reported, 0)

  useEffect(() => {
    if (!halfVacation || !hoursExceedWindow(reported, hoursTarget)) {
      acknowledgedOverHalfDay.current = null
    }
  }, [halfVacation, hoursTarget, reported])
  const hasHierarchy = (options?.clients.length ?? 0) > 0
  const hasSavedDay = (initialReports?.length ?? 0) > 0 || dayAbsences.length > 0
  const deleteCopy = dayDeleteCopy(dayAbsences, (initialReports?.length ?? 0) > 0)
  /** Options loaded and came back empty — the employee is assigned to nothing. */
  const noAssignments = Boolean(options) && !hasHierarchy

  const progressHint =
    fields.length === 0
      ? noAssignments
        ? 'אין פרויקטים לדיווח'
        : 'הוסיפו פרויקטים כדי לדווח את השעות'
      : remaining > 0
        ? `חסרות ${formatHours(remaining)} שעות לדיווח`
        : 'הדיווח הושלם'

  const rowErrors = (index: number): RowErrors => {
    const issues = errors.rows?.[index]
    if (!issues) return {}
    const projectMessage = issues.clientId?.message ?? issues.projectId?.message
    return {
      projectId: projectMessage,
      taskId: issues.taskId?.message,
      workLocation: issues.workLocation?.message,
      hours: issues.hours?.message,
      rowStartTime: issues.rowStartTime?.message,
      rowEndTime: issues.rowEndTime?.message,
      description: issues.description?.message,
    }
  }

  const clearRowFieldErrors = (index: number) => {
    const paths = (
      ['clientId', 'projectId', 'taskId', 'workLocation', 'hours', 'rowStartTime', 'rowEndTime', 'description'] as const
    ).map(
      (field) => `rows.${index}.${field}` as FieldPath<ManualReportValues>,
    )
    clearErrors(paths)
  }

  const showErrorToast = (toast: { title: string; detail: string }) => {
    message.error({
      content: (
        <div>
          <strong>{toast.title}</strong>
          <div>{toast.detail}</div>
        </div>
      ),
      duration: 6,
    })
  }

  const showWarningToast = (toast: { title: string; detail: string }) => {
    message.warning({
      content: (
        <div>
          <strong>{toast.title}</strong>
          <div>{toast.detail}</div>
        </div>
      ),
      duration: 6,
    })
  }

  const addRow = () => {
    append(emptyRow())
  }

  const selectProject = (index: number, clientId: string, projectId: string) => {
    clearRowFieldErrors(index)
    setValue(`rows.${index}.clientId`, clientId, { shouldValidate: false, shouldDirty: true })
    setValue(`rows.${index}.projectId`, projectId, { shouldValidate: false, shouldDirty: true })
    const tasks =
      options?.clients
        .find((client) => client.id === clientId)
        ?.projects.find((project) => project.id === projectId)?.tasks ?? []
    setValue(`rows.${index}.taskId`, tasks.length === 1 && tasks[0] ? tasks[0].id : '', {
      shouldValidate: false,
      shouldDirty: true,
    })
    // Picking another project makes this a new row, so it stops being the saved
    // one and follows the chosen project's current format (design D6).
    setValue(`rows.${index}.savedFormat`, undefined, { shouldValidate: false, shouldDirty: true })
    // The card is about to swap its inputs, so whatever the other format left
    // behind has to go — a hidden stale value would be submitted invisibly.
    if (projectFormat(options, clientId, projectId) === 'CLOCK_IN_OUT') {
      setValue(`rows.${index}.hours`, 0, { shouldValidate: false, shouldDirty: true })
    } else {
      setValue(`rows.${index}.rowStartTime`, '', { shouldValidate: false, shouldDirty: true })
      setValue(`rows.${index}.rowEndTime`, '', { shouldValidate: false, shouldDirty: true })
    }
  }

  const onSubmit = async (values: ManualReportValues) => {
    if (!hasHierarchy) {
      showErrorToast(EMPTY_TREE)
      return
    }
    const allocated = values.rows.reduce(
      (sum, row) => sum + rowAllocatedHours(options, values.dayStart, row),
      0,
    )
    const cap = workHoursTarget(attendanceWindowHours(values.dayStart, values.dayEnd), halfVacation)
    if (hoursShortOfWindow(allocated, cap)) {
      showErrorToast(UNDERFILL)
      return
    }
    if (halfVacation && hoursExceedWindow(allocated, cap)) {
      if (acknowledgedOverHalfDay.current !== allocated) {
        acknowledgedOverHalfDay.current = allocated
        showWarningToast(halfDayOverTargetBanner(allocated, cap))
        return
      }
    }
    try {
      await saveBatch({
        date: values.date,
        startTime: values.dayStart,
        endTime: values.dayEnd,
        rows: values.rows.map((row) =>
          toReportRow(
            {
              clientId: row.clientId,
              projectId: row.projectId,
              taskId: row.taskId,
              workLocation: row.workLocation as WorkLocation,
              hours: row.hours,
              rowStartTime: row.rowStartTime,
              rowEndTime: row.rowEndTime,
              description: row.description,
            },
            rowFormat(row, options),
          ),
        ),
      })
      message.success('הדיווח נשמר בהצלחה')
      onSaved?.()
      reset(freshDay(initialDate, initialReports))
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        const details = apiFieldErrors(error.body)
        applyApiFieldErrors(details, setError)
        const code = (error.body as { error?: { code?: string } } | undefined)?.error?.code
        showErrorToast(code === 'HOURS_EXCEED_WINDOW' ? overflowBanner(reported, windowHours) : MISSING_DETAILS)
        return
      }
      if (error instanceof ApiError && error.status === 409) {
        showErrorToast(MONTH_LOCKED)
        return
      }
      showErrorToast(error instanceof ApiError && error.status === 429 ? TOO_MANY_SAVES : SAVE_FAILED)
    }
  }

  // An employee with no assignment cannot add a row, so the day never validates.
  // Saying "a detail or two is missing" would send them looking for a field that
  // is not there — explain the missing assignment instead.
  const onInvalid = (formErrors: FieldErrors<ManualReportValues>) =>
    showErrorToast(noAssignments ? EMPTY_TREE : bannerForInvalid(formErrors, reported, windowHours))

  const deleteSavedDay = async () => {
    setPendingDayDelete(false)
    const date = day.date || initialDate
    if (!date) return
    try {
      if ((initialReports?.length ?? 0) > 0) {
        await deleteDay(date)
      }
      if (allowAbsenceTab) {
        for (const absence of dayAbsences) {
          await deleteAbsence(absence.id)
        }
      }
      message.success('הדיווח נמחק')
      onSaved?.()
      reset(freshDay(date))
      onClose()
    } catch (error) {
      showErrorToast(error instanceof ApiError && error.status === 409 ? MONTH_LOCKED : SAVE_FAILED)
    }
  }

  if (loadError) {
    return (
      <div className="manual-report manual-report--desktop">
        <header className="manual-report__top">
          <button type="button" className="manual-report__icon-btn" onClick={onClose} aria-label="סגירה">
            <img src={closeCircle} alt="" width={24} height={24} />
          </button>
          <p className="manual-report__load-error">{loadError}</p>
        </header>
      </div>
    )
  }

  const tabs = allowAbsenceTab ? (
        <div className="manual-report__tabs" role="tablist" aria-label="סוג דיווח">
          <button
            type="button"
            role="tab"
            className={`manual-report__tab${reportTab === 'hours' ? ' manual-report__tab--active' : ''}`}
            aria-selected={reportTab === 'hours'}
            onClick={() => setReportTab('hours')}
          >
            דיווח ידני
          </button>
          <button
            type="button"
            role="tab"
            className={`manual-report__tab${reportTab === 'absence' ? ' manual-report__tab--active' : ''}`}
            aria-selected={reportTab === 'absence'}
            onClick={() => setReportTab('absence')}
          >
            דיווח העדרות
          </button>
        </div>
  ) : null

  const topChrome = (
        <header className="manual-report__top">
          <div className="manual-report__top-meta">
            <div className="manual-report__top-date">
              <label className="manual-report__date-picker">
                <span className="manual-report__date-icon" aria-hidden="true">
                  <img src={calendarJobs} alt="" width={24} height={24} />
                </span>
                <span className="manual-report__date" id="manual-report-day-title">
                  {formatDayTitle(day.date ?? '')}
                </span>
                <input
                  type="date"
                  className="manual-report__date-input"
                  aria-label="תאריך הדיווח"
                  {...register('date')}
                />
              </label>
            </div>
          </div>
          <div className="manual-report__top-actions">
            <button
              type="button"
              className="manual-report__delete-day"
              disabled={!hasSavedDay}
              aria-label="מחיקת דיווח"
              title={hasSavedDay ? 'מחיקת דיווח' : 'אין דיווח שמור למחוק'}
              onClick={() => {
                if (!hasSavedDay) return
                setPendingDayDelete(true)
              }}
            >
              <span className="manual-report__delete-day-label">מחיקת דיווח</span>
              <img src={trashIcon} alt="" width={24} height={24} />
            </button>
            <button type="button" className="manual-report__icon-btn" onClick={onClose} aria-label="סגירה">
              <img src={closeCircle} alt="" width={24} height={24} />
            </button>
          </div>
          {errors.date ? <p className="manual-report__field-error manual-report__date-error">{errors.date.message}</p> : null}
        </header>
  )

  return (
    <div className="manual-report manual-report--desktop" aria-labelledby="manual-report-day-title">
      {reportTab === 'hours' ? (
        <form className="manual-report__panel" onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
          <div className="manual-report__scroll">
            {topChrome}
            {tabs}

        <section className="manual-report__hours">
          <button
            type="button"
            className="manual-report__hours-head"
            onClick={() => setHoursOpen((open) => !open)}
            aria-expanded={hoursOpen}
          >
            <div className="manual-report__hours-title">
              <img src={clockLinear} alt="" width={24} height={24} />
              <span>שעות עבודה</span>
              <img src={infoCircle} alt="" width={16} height={16} />
              <span className="manual-report__quota">
                <img src={scheduleGreen} alt="" width={16} height={16} />
                תקן יומי {STANDARD_HOURS} שע׳
              </span>
            </div>
            <img
              src={sectionChevron}
              alt=""
              className={`manual-report__hours-chevron${hoursOpen ? ' manual-report__hours-chevron--open' : ''}`}
              width={12}
              height={6}
            />
          </button>

          {hoursOpen ? (
            <div className="manual-report__hours-fields">
              <label className="manual-report__field">
                <span className="manual-report__field-label">שעת כניסה</span>
                <span className="manual-report__field-shell">
                  <input type="time" className="manual-report__field-input" aria-label="שעת כניסה" {...register('dayStart')} />
                </span>
              </label>
              <label className="manual-report__field">
                <span className="manual-report__field-label">שעת יציאה</span>
                <span className="manual-report__field-shell">
                  <input type="time" className="manual-report__field-input" aria-label="שעת יציאה" {...register('dayEnd')} />
                </span>
              </label>
              <div className="manual-report__field">
                <span className="manual-report__field-label">סה״כ שעות</span>
                <span className="manual-report__field-shell manual-report__field-shell--readonly">
                  <output
                    className="manual-report__field-input manual-report__field-input--readonly"
                    aria-label="סה״כ שעות"
                    aria-live="polite"
                  >
                    {formatTotalHoursLabel(windowHours)}
                  </output>
                </span>
              </div>
            </div>
          ) : null}
        </section>

        <section className="manual-report__projects">
          <div className="manual-report__projects-head">
            <img src={messageEdit} alt="" width={24} height={24} />
            <h2>פרויקטים</h2>
          </div>

          {fields.length === 0 ? (
            <div className="manual-report__projects-empty">
              <img
                src={cactusIllustration}
                alt=""
                className="manual-report__projects-empty-art"
                width={124}
                height={124}
              />
              <p className="manual-report__projects-empty-title">
                {noAssignments ? NO_ASSIGNED_PROJECTS.title : 'עדיין אין פרויקטים מדווחים'}
              </p>
              <p className="manual-report__projects-empty-hint">
                {noAssignments
                  ? NO_ASSIGNED_PROJECTS.hint
                  : 'לחצו על כפתור ״הוספת פרויקט״ ותתחילו למלא את הפרטים הרלוונטים.'}
              </p>
            </div>
          ) : null}

          {options
            ? fields.map((field, index) => (
                <ManualReportProjectCard
                  key={field.id}
                  index={index}
                  variant="desktop"
                  values={rows[index] ?? emptyRow()}
                  dayStart={day.dayStart ?? ''}
                  options={options}
                  errors={rowErrors(index)}
                  register={register}
                  onProjectChange={(clientId, projectId) => selectProject(index, clientId, projectId)}
                  onTaskChange={(taskId) => {
                    clearRowFieldErrors(index)
                    setValue(`rows.${index}.taskId`, taskId, { shouldValidate: false, shouldDirty: true })
                  }}
                  onLocationChange={(location) => {
                    clearRowFieldErrors(index)
                    setValue(`rows.${index}.workLocation`, location, { shouldValidate: false, shouldDirty: true })
                  }}
                  onHoursChange={() => {
                    clearRowFieldErrors(index)
                  }}
                  onRemove={() => setPendingRemoval(index)}
                />
              ))
            : null}

          {noAssignments && fields.length > 0 ? (
            <p className="manual-report__empty-hierarchy">{NO_ASSIGNED_PROJECTS.short}</p>
          ) : null}

          <button
            type="button"
            className="manual-report__add"
            onClick={addRow}
            disabled={!hasHierarchy}
            title={noAssignments ? NO_ASSIGNED_PROJECTS.short : undefined}
          >
            הוספת פרויקט
            <img src={addCircleBlue} alt="" width={24} height={24} />
          </button>
        </section>
          </div>
          <footer className="manual-report__footer">
        <div className="manual-report__summary">
          <div className="manual-report__summary-head">
            <span className="manual-report__summary-title">סיכום</span>
            <div className="manual-report__summary-badges">
              {fields.length > 0 ? (
                <span className="manual-report__summary-badge">{fields.length} פרויקטים</span>
              ) : null}
              {reported > 0 ? (
                <span className="manual-report__summary-badge">סה״כ {formatHours(reported)} שעות</span>
              ) : null}
            </div>
          </div>
          <div className="manual-report__progress-labels">
            <span>{progressHint}</span>
            <span>
              {formatHours(reported)} מתוך {formatHours(hoursTarget || STANDARD_HOURS)} שעות
            </span>
          </div>
          <div
            className="manual-report__progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={hoursTarget || STANDARD_HOURS}
            aria-valuenow={reported}
          >
            <div
              className="manual-report__progress-fill"
              style={{
                width: `${Math.min(reported / (hoursTarget || STANDARD_HOURS), 1) * 100}%`,
              }}
            />
          </div>
        </div>
        <button type="submit" className="manual-report__save" disabled={isSubmitting}>
          שמירה
        </button>
      </footer>
        </form>
      ) : (
        <div className="manual-report__scroll">
          {topChrome}
          {tabs}
          <AbsenceReportForm
            onClose={onClose}
            onSaved={() => {
              onSaved?.()
            }}
            defaultStartDate={day.date || initialDate}
            existingAbsence={dayAbsences[0]}
          />
        </div>
      )}

      {pendingDayDelete ? (
        <ManualReportDeleteDialog
          title={deleteCopy.title}
          body={deleteCopy.body}
          confirmLabel={deleteCopy.confirmLabel}
          onCancel={() => setPendingDayDelete(false)}
          onConfirm={() => {
            void deleteSavedDay()
          }}
        />
      ) : null}

      {pendingRemoval !== null ? (
        <ManualReportDeleteDialog
          onCancel={() => setPendingRemoval(null)}
          onConfirm={() => {
            remove(pendingRemoval)
            setPendingRemoval(null)
          }}
        />
      ) : null}
    </div>
  )
}

export default ManualReport
