import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch, type FieldErrors, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { App } from 'antd'
import { ApiError } from '../services/apiClient'
import dayjs from '../services/dayjs'
import { deleteAbsence } from '../services/absences'
import { createReportBatch, deleteReportsForDate, getReportingOptions } from '../services/reports'
import type { Absence, ReportingOptions, TimeReportListItem, WorkLocation } from '../types'
import {
  attendanceWindowHours,
  manualReportSchema,
  OVERFLOW_HOURS_MESSAGE,
  type ManualReportValues,
  type ProjectRowValues,
} from './ManualReport.schema'
import AbsenceReportForm from './AbsenceReportForm'
import ManualReportDeleteDialog from './ManualReportDeleteDialog'
import ManualReportProjectCard, { type RowErrors } from './ManualReportProjectCard'
import { CloseMark, WarningTriangle } from './ManualReportIcons'
import addCircleBlue from '../assets/manual-report/desktop/add-circle-blue.svg'
import alertFill from '../assets/manual-report/desktop/alert-fill.svg'
import buildingIcon from '../assets/manual-report/desktop/building.svg'
import calendarJobs from '../assets/manual-report/desktop/calendar-jobs.svg'
import clockLinear from '../assets/manual-report/desktop/clock-linear.svg'
import closeCircle from '../assets/manual-report/desktop/close-circle.svg'
import infoCircle from '../assets/manual-report/desktop/info-circle.svg'
import messageEdit from '../assets/manual-report/desktop/message-edit.svg'
import noteIcon from '../assets/manual-report/desktop/note.svg'
import scheduleGreen from '../assets/manual-report/desktop/schedule-green.svg'
import sectionChevron from '../assets/manual-report/desktop/section-chevron.svg'
import trashIcon from '../assets/manual-report/desktop/trash.svg'
import cactusIllustration from '../assets/manual-report/desktop/cactus-illustration.svg'
import tagCheckGreen from '../assets/home/tag-check-green.svg'
import tagAlertOrange from '../assets/home/tag-alert-orange.svg'
import tagCloseBlue from '../assets/home/tag-close-blue.svg'
import { DAY_STATUS_LABELS } from '../lib/dayStatusLabels'
import './ManualReport.css'

const STANDARD_HOURS = 9

const MISSING_DETAILS = {
  title: 'חסר לנו פרט או שניים',
  detail: 'מלא את כל הנתונים הדרושים כדי שנוכל לשמור את הדיווח בהצלחה.',
}
const ZERO_HOURS = {
  title: 'שעות לא תקינות',
  detail: 'יש להזין מספר בין 0.5 ל-24, עם לכל היותר ספרה אחת אחרי הנקודה.',
}
const EMPTY_TREE = {
  title: 'אין פרויקטים לדיווח',
  detail: 'אין מידע זמין כרגע, נסו שוב מאוחר יותר או פנו למנהל ישיר',
}
const TOO_MANY_SAVES = {
  title: 'שמרתם יותר מדי פעמים ברצף',
  detail: 'המתינו כמה דקות ונסו לשמור את הדיווח שוב.',
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
}

interface Props {
  onClose: () => void
  onSaved?: () => void
  initialDate?: string
  initialReports?: TimeReportListItem[]
  initialAbsences?: Absence[]
  headerMeta?: ManualReportHeaderMeta
}

const STATUS_ICONS: Record<ManualReportHeaderTone, string> = {
  missing: alertFill,
  full: tagCheckGreen,
  partial: tagAlertOrange,
  weekend: tagCloseBlue,
  absence: tagCloseBlue,
}

function emptyRow(): ProjectRowValues {
  return { clientId: '', projectId: '', taskId: '', workLocation: '', hours: 0, description: '' }
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
  if (/invalid uuid/i.test(message)) {
    return 'ערך לא תקין — בחרו שוב מהרשימה'
  }
  if (message.includes('cannot exceed the attendance window')) {
    return OVERFLOW_HOURS_MESSAGE
  }
  return message
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

function tagIcon(tag: ManualReportHeaderTag): string {
  if (tag.icon) return tag.icon
  if (tag.text.includes('פרויקט')) return noteIcon
  return buildingIcon
}

function hoursShortOfWindow(allocated: number, windowHours: number): boolean {
  return windowHours > 0 && allocated + 0.1 <= windowHours + 1e-9
}

function deriveHeader(
  headerMeta: ManualReportHeaderMeta | undefined,
  reportedHours: number,
  windowHours: number,
): ManualReportHeaderMeta {
  if (headerMeta?.tone === 'weekend') {
    return { status: headerMeta.status, tone: 'weekend', tags: [] }
  }
  if (headerMeta?.tone === 'absence') {
    return { status: headerMeta.status, tone: 'absence', tags: [] }
  }
  if (hoursShortOfWindow(reportedHours, windowHours) || reportedHours <= 0) {
    return { status: DAY_STATUS_LABELS.missing, tone: 'missing', tags: [] }
  }
  if (windowHours >= STANDARD_HOURS || reportedHours >= STANDARD_HOURS) {
    return { status: DAY_STATUS_LABELS.full, tone: 'full', tags: [] }
  }
  return { status: DAY_STATUS_LABELS.partial, tone: 'partial', tags: [] }
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
  const extra = Math.max(0, Math.round((allocated - windowHours) * 10) / 10)
  return {
    title: 'יותר מדי שעות בפרויקטים',
    detail: `סכום שעות הפרויקטים הוא ${formatHours(allocated)}, וחלון הכניסה–יציאה הוא ${hoursPhrase(windowHours)}. יש להפחית ${hoursPhrase(extra)}.`,
  }
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
  const rowIssues = Object.entries(rowList ?? {})
    .filter(([key]) => /^\d+$/.test(key))
    .map(([, value]) => value)
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
  headerMeta,
}: Props) {
  const { message } = App.useApp()
  const [options, setOptions] = useState<ReportingOptions | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ title: string; detail: string } | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<number | null>(null)
  const [pendingDayDelete, setPendingDayDelete] = useState(false)
  const [hoursOpen, setHoursOpen] = useState(true)
  const [reportTab, setReportTab] = useState<'hours' | 'absence'>(() =>
    (initialAbsences?.length ?? 0) > 0 && (initialReports?.length ?? 0) === 0 ? 'absence' : 'hours',
  )

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
    resolver: zodResolver(manualReportSchema),
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
    getReportingOptions()
      .then((tree) => {
        if (!cancelled) setOptions(tree)
      })
      .catch(() => {
        if (!cancelled) setLoadError('לא ניתן לטעון פרויקטים ומשימות. נסו שוב.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const dayTotal = useMemo(
    () => attendanceWindowHours(day.dayStart ?? '', day.dayEnd ?? ''),
    [day.dayStart, day.dayEnd],
  )
  const reported = useMemo(
    () => rows.reduce((total, row) => total + Number(row.hours || 0), 0),
    [rows],
  )
  const remaining = Math.max(dayTotal - reported, 0)
  const hasHierarchy = (options?.clients.length ?? 0) > 0
  const dayAbsences = initialAbsences ?? []
  const hasSavedDay = (initialReports?.length ?? 0) > 0 || dayAbsences.length > 0
  const deleteCopy = dayDeleteCopy(dayAbsences, (initialReports?.length ?? 0) > 0)
  const header = deriveHeader(headerMeta, reported, dayTotal)
  const rowsError = arrayErrorMessage(errors.rows)

  const progressHint =
    fields.length === 0
      ? 'הוסיפו פרויקטים כדי לדווח את השעות'
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
      description: issues.description?.message,
    }
  }

  const clearRowFieldErrors = (index: number) => {
    const paths = (['clientId', 'projectId', 'taskId', 'workLocation', 'hours', 'description'] as const).map(
      (field) => `rows.${index}.${field}` as FieldPath<ManualReportValues>,
    )
    clearErrors(paths)
  }

  const addRow = () => {
    setBanner(null)
    append(emptyRow())
  }

  const selectProject = (index: number, clientId: string, projectId: string) => {
    setBanner(null)
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
  }

  const onSubmit = async (values: ManualReportValues) => {
    setBanner(null)
    if (!hasHierarchy) {
      setBanner(EMPTY_TREE)
      return
    }
    try {
      await createReportBatch({
        date: values.date,
        startTime: values.dayStart,
        endTime: values.dayEnd,
        rows: values.rows.map((row) => ({
          clientId: row.clientId,
          projectId: row.projectId,
          taskId: row.taskId,
          workLocation: row.workLocation as WorkLocation,
          hours: Number(row.hours),
          description: row.description,
        })),
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
        setBanner(code === 'HOURS_EXCEED_WINDOW' ? overflowBanner(reported, dayTotal) : MISSING_DETAILS)
        return
      }
      setBanner(error instanceof ApiError && error.status === 429 ? TOO_MANY_SAVES : SAVE_FAILED)
    }
  }

  const onInvalid = (formErrors: FieldErrors<ManualReportValues>) =>
    setBanner(bannerForInvalid(formErrors, reported, dayTotal))

  const deleteSavedDay = async () => {
    setPendingDayDelete(false)
    setBanner(null)
    const date = day.date || initialDate
    if (!date) return
    try {
      if ((initialReports?.length ?? 0) > 0) {
        await deleteReportsForDate(date)
      }
      for (const absence of dayAbsences) {
        await deleteAbsence(absence.id)
      }
      message.success('הדיווח נמחק')
      onSaved?.()
      reset(freshDay(date))
      onClose()
    } catch {
      setBanner(SAVE_FAILED)
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

  const tabs = (
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
  )

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
            <div className="manual-report__header-tags">
              <span className={`manual-report__header-tag manual-report__header-tag--${header.tone}`}>
                {header.status}
                {header.tone !== 'weekend' && header.tone !== 'absence' ? (
                  <img src={STATUS_ICONS[header.tone]} alt="" width={16} height={16} />
                ) : null}
              </span>
              {header.tags.length > 0 ? <span className="manual-report__header-sep" aria-hidden="true" /> : null}
              {header.tags.map((tag) => (
                <span key={tag.text} className="manual-report__header-tag manual-report__header-tag--neutral">
                  {tag.text}
                  <img src={tagIcon(tag)} alt="" width={16} height={16} />
                </span>
              ))}
            </div>
          </div>
          <div className="manual-report__top-actions">
            <button
              type="button"
              className="manual-report__delete-day"
              disabled={!hasSavedDay}
              title={hasSavedDay ? undefined : 'אין דיווח שמור למחוק'}
              onClick={() => {
                if (!hasSavedDay) return
                setBanner(null)
                setPendingDayDelete(true)
              }}
            >
              מחיקת דיווח
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
            {banner ? (
          <div className="manual-report__banner" role="alert">
            <span className="manual-report__banner-icon">
              <WarningTriangle />
            </span>
            <div className="manual-report__banner-text">
              <h2>{banner.title}</h2>
              <p>{banner.detail}</p>
            </div>
            <button type="button" onClick={() => setBanner(null)} aria-label="סגירת ההודעה">
              <CloseMark />
            </button>
          </div>
        ) : null}

        <section className="manual-report__hours">
          <button
            type="button"
            className="manual-report__hours-head"
            onClick={() => setHoursOpen((open) => !open)}
            aria-expanded={hoursOpen}
          >
            <img
              src={sectionChevron}
              alt=""
              className={`manual-report__hours-chevron${hoursOpen ? ' manual-report__hours-chevron--open' : ''}`}
              width={12}
              height={6}
            />
            <div className="manual-report__hours-title">
              <img src={clockLinear} alt="" width={24} height={24} />
              <span>שעות עבודה</span>
              <img src={infoCircle} alt="" width={16} height={16} />
              <span className="manual-report__quota">
                <img src={scheduleGreen} alt="" width={16} height={16} />
                תקן יומי {STANDARD_HOURS} שע׳
              </span>
            </div>
          </button>

          {hoursOpen ? (
            <div className="manual-report__hours-fields">
              <label className="manual-report__field">
                <span className="manual-report__field-label">שעת כניסה</span>
                <input type="time" className="manual-report__field-input" aria-label="שעת כניסה" {...register('dayStart')} />
              </label>
              <label className="manual-report__field">
                <span className="manual-report__field-label">שעת יציאה</span>
                <input type="time" className="manual-report__field-input" aria-label="שעת יציאה" {...register('dayEnd')} />
              </label>
              <div className="manual-report__field">
                <span className="manual-report__field-label">סה״כ שעות</span>
                <output className="manual-report__field-input manual-report__field-input--readonly" aria-live="polite">
                  {formatTotalHoursLabel(dayTotal)}
                </output>
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
              <p className="manual-report__projects-empty-title">עדיין אין פרויקטים מדווחים</p>
              <p className="manual-report__projects-empty-hint">
                לחצו על כפתור ״הוספת פרויקט״ ותתחילו למלא את הפרטים הרלוונטים.
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
                  options={options}
                  errors={rowErrors(index)}
                  register={register}
                  onProjectChange={(clientId, projectId) => selectProject(index, clientId, projectId)}
                  onTaskChange={(taskId) => {
                    setBanner(null)
                    clearRowFieldErrors(index)
                    setValue(`rows.${index}.taskId`, taskId, { shouldValidate: false, shouldDirty: true })
                  }}
                  onLocationChange={(location) => {
                    setBanner(null)
                    clearRowFieldErrors(index)
                    setValue(`rows.${index}.workLocation`, location, { shouldValidate: false, shouldDirty: true })
                  }}
                  onHoursChange={() => {
                    setBanner(null)
                    clearRowFieldErrors(index)
                  }}
                  onRemove={() => setPendingRemoval(index)}
                />
              ))
            : null}

          {!hasHierarchy && options ? (
            <p className="manual-report__empty-hierarchy">אין מידע זמין כרגע, נסו שוב מאוחר יותר או פנו למנהל ישיר</p>
          ) : null}

          <button type="button" className="manual-report__add" onClick={addRow} disabled={!hasHierarchy}>
            הוספת פרויקט
            <img src={addCircleBlue} alt="" width={24} height={24} />
          </button>
          {rowsError ? <p className="manual-report__field-error">{rowsError}</p> : null}
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
              {hoursShortOfWindow(reported, dayTotal) && reported > 0 ? (
                <span className="manual-report__summary-badge manual-report__summary-badge--missing">חסר</span>
              ) : null}
            </div>
          </div>
          <div className="manual-report__progress-labels">
            <span>{progressHint}</span>
            <span>
              {formatHours(reported)} מתוך {formatHours(dayTotal || STANDARD_HOURS)} שעות
            </span>
          </div>
          <div
            className="manual-report__progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={dayTotal || STANDARD_HOURS}
            aria-valuenow={reported}
          >
            <div
              className="manual-report__progress-fill"
              style={{
                width: `${Math.min(reported / (dayTotal || STANDARD_HOURS), 1) * 100}%`,
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
            onSaved={onSaved}
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
