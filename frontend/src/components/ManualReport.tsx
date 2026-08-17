import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { App } from 'antd'
import { ApiError } from '../services/apiClient'
import dayjs from '../services/dayjs'
import { createReportBatch, getReportingOptions } from '../services/reports'
import type { ReportingOptions, WorkLocation } from '../types'
import { manualReportSchema, type ManualReportValues, type ProjectRowValues } from './ManualReport.schema'
import ManualReportDeleteDialog from './ManualReportDeleteDialog'
import ManualReportPicker from './ManualReportPicker'
import { type PickerStep } from './ManualReport.constants'
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
import './ManualReport.css'

const STANDARD_HOURS = 9
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const NEXT_STEP: Record<PickerStep, PickerStep | null> = {
  project: 'task',
  task: 'location',
  location: null,
}

const MISSING_DETAILS = {
  title: 'חסר לנו פרט או שניים',
  detail: 'מלא את כל הנתונים הדרושים כדי שנוכל לשמור את הדיווח בהצלחה.',
}
const TOO_MANY_SAVES = {
  title: 'שמרתם יותר מדי פעמים ברצף',
  detail: 'המתינו כמה דקות ונסו לשמור את הדיווח שוב.',
}
const SAVE_FAILED = {
  title: 'משהו השתבש. נסו שוב.',
  detail: 'לא הצלחנו לשמור את הדיווח. בדקו את החיבור ונסו שוב.',
}

export type ManualReportHeaderTone = 'missing' | 'full' | 'partial' | 'weekend'

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
  headerMeta?: ManualReportHeaderMeta
}

const STATUS_ICONS: Record<ManualReportHeaderTone, string> = {
  missing: alertFill,
  full: tagCheckGreen,
  partial: tagAlertOrange,
  weekend: tagCloseBlue,
}

function emptyRow(startTime: string, endTime: string): ProjectRowValues {
  return { clientId: '', projectId: '', taskId: '', workLocation: '', startTime, endTime, description: '' }
}

function freshDay(date?: string): ManualReportValues {
  const day = date ? dayjs(date) : dayjs()
  return {
    date: day.isValid() ? day.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    dayStart: '09:00',
    dayEnd: '18:00',
    rows: [],
  }
}

function hoursBetween(start: string, end: string): number {
  if (!HHMM.test(start) || !HHMM.test(end)) return 0
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  return minutes > 0 ? minutes / 60 : 0
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

function deriveHeader(
  headerMeta: ManualReportHeaderMeta | undefined,
  projectCount: number,
  reportedHours: number,
): ManualReportHeaderMeta {
  if (headerMeta?.tone === 'weekend') {
    return { status: headerMeta.status, tone: 'weekend', tags: [] }
  }
  if (projectCount > 0 && reportedHours >= STANDARD_HOURS) {
    return { status: 'מלא', tone: 'full', tags: [] }
  }
  if (reportedHours > 0) {
    return { status: 'חלקי', tone: 'partial', tags: [] }
  }
  return { status: 'חסר', tone: 'missing', tags: [] }
}

/**
 * Desktop דיווח ידני side panel — Figma frame 1:17385 beside the hours home.
 */
function ManualReport({ onClose, onSaved, initialDate, headerMeta }: Props) {
  const { message } = App.useApp()
  const [options, setOptions] = useState<ReportingOptions | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ title: string; detail: string } | null>(null)
  const [picker, setPicker] = useState<{ row: number; step: PickerStep } | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<number | null>(null)
  const [hoursOpen, setHoursOpen] = useState(true)

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
    defaultValues: freshDay(initialDate),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'rows' })
  const day = useWatch({ control })
  const rows = useMemo(() => (day.rows ?? []) as ProjectRowValues[], [day.rows])

  useEffect(() => {
    reset(freshDay(initialDate))
  }, [initialDate, reset])

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
    () => hoursBetween(day.dayStart ?? '', day.dayEnd ?? ''),
    [day.dayStart, day.dayEnd],
  )
  const reported = useMemo(
    () => rows.reduce((total, row) => total + hoursBetween(row.startTime, row.endTime), 0),
    [rows],
  )
  const remaining = Math.max(STANDARD_HOURS - reported, 0)
  const hasHierarchy = (options?.clients.length ?? 0) > 0
  const header = deriveHeader(headerMeta, fields.length, reported)

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
      startTime: issues.startTime?.message,
      endTime: issues.endTime?.message,
      description: issues.description?.message,
    }
  }

  const clearRowFieldErrors = (index: number) => {
    const paths = (
      ['clientId', 'projectId', 'taskId', 'workLocation', 'startTime', 'endTime', 'description'] as const
    ).map((field) => `rows.${index}.${field}` as FieldPath<ManualReportValues>)
    clearErrors(paths)
  }

  const addRow = () => {
    setBanner(null)
    append(emptyRow(day.dayStart ?? '09:00', day.dayEnd ?? '18:00'))
    setPicker({ row: fields.length, step: 'project' })
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

  const advancePicker = () => {
    if (!picker) return
    const next = NEXT_STEP[picker.step]
    setPicker(next ? { row: picker.row, step: next } : null)
  }

  const stepBack = () => {
    if (!picker) return
    if (picker.step === 'task') setPicker({ row: picker.row, step: 'project' })
    else if (picker.step === 'location') setPicker({ row: picker.row, step: 'task' })
    else setPicker(null)
  }

  const openPicker = (row: number, step: PickerStep) => {
    const values = rows[row]
    if (step === 'task' && !values?.projectId) setPicker({ row, step: 'project' })
    else setPicker({ row, step })
  }

  const onSubmit = async (values: ManualReportValues) => {
    setBanner(null)
    try {
      await createReportBatch({
        date: values.date,
        rows: values.rows.map((row) => ({
          clientId: row.clientId,
          projectId: row.projectId,
          taskId: row.taskId,
          workLocation: row.workLocation as WorkLocation,
          startTime: row.startTime,
          endTime: row.endTime,
          description: row.description,
        })),
      })
      message.success('הדיווח נשמר בהצלחה')
      onSaved?.()
      reset(freshDay(initialDate))
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        const details = apiFieldErrors(error.body)
        applyApiFieldErrors(details, setError)
        setBanner(MISSING_DETAILS)
        return
      }
      setBanner(error instanceof ApiError && error.status === 429 ? TOO_MANY_SAVES : SAVE_FAILED)
    }
  }

  const onInvalid = () => setBanner(MISSING_DETAILS)

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

  return (
    <form
      className="manual-report manual-report--desktop"
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      noValidate
      aria-labelledby="manual-report-day-title"
    >
      <div className="manual-report__scroll">
        <header className="manual-report__top">
          <div className="manual-report__top-actions">
            <button type="button" className="manual-report__icon-btn" onClick={onClose} aria-label="סגירה">
              <img src={closeCircle} alt="" width={24} height={24} />
            </button>
            <button
              type="button"
              className="manual-report__delete-day"
              disabled
              title="בקרוב"
              aria-disabled="true"
            >
              <img src={trashIcon} alt="" width={24} height={24} />
              מחיקת דיווח
            </button>
          </div>

          <div className="manual-report__top-meta">
            <div className="manual-report__header-tags">
              <span className={`manual-report__header-tag manual-report__header-tag--${header.tone}`}>
                {header.status}
                <img src={STATUS_ICONS[header.tone]} alt="" width={16} height={16} />
              </span>
              {header.tags.length > 0 ? <span className="manual-report__header-sep" aria-hidden="true" /> : null}
              {header.tags.map((tag) => (
                <span key={tag.text} className="manual-report__header-tag manual-report__header-tag--neutral">
                  {tag.text}
                  <img src={tagIcon(tag)} alt="" width={16} height={16} />
                </span>
              ))}
            </div>
            <div className="manual-report__top-date">
              <label className="manual-report__date-picker">
                <span className="manual-report__date" id="manual-report-day-title">
                  {formatDayTitle(day.date ?? '')}
                </span>
                <span className="manual-report__date-icon" aria-hidden="true">
                  <img src={calendarJobs} alt="" width={24} height={24} />
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
          {errors.date ? <p className="manual-report__field-error manual-report__date-error">{errors.date.message}</p> : null}
        </header>

        <div className="manual-report__tabs" role="tablist" aria-label="סוג דיווח">
          <button type="button" role="tab" className="manual-report__tab manual-report__tab--active" aria-selected="true">
            דיווח ידני
          </button>
          <button type="button" role="tab" className="manual-report__tab" aria-selected="false" disabled>
            דיווח העדרות
          </button>
        </div>

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
          {errors.dayEnd ? <p className="manual-report__field-error">{errors.dayEnd.message}</p> : null}
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
                  values={rows[index] ?? emptyRow('', '')}
                  options={options}
                  errors={rowErrors(index)}
                  register={register}
                  onPick={(step) => openPicker(index, step)}
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
          {errors.rows?.message ? <p className="manual-report__field-error">{errors.rows.message}</p> : null}
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
              {formatHours(reported)} מתוך {STANDARD_HOURS} שעות
            </span>
          </div>
          <div
            className="manual-report__progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={STANDARD_HOURS}
            aria-valuenow={reported}
          >
            <div
              className="manual-report__progress-fill"
              style={{ width: `${Math.min(reported / STANDARD_HOURS, 1) * 100}%` }}
            />
          </div>
        </div>
        <button type="submit" className="manual-report__save" disabled={!hasHierarchy || isSubmitting}>
          שמירה
        </button>
      </footer>

      {picker && options ? (
        <ManualReportPicker
          step={picker.step}
          options={options}
          clientId={rows[picker.row]?.clientId ?? ''}
          projectId={rows[picker.row]?.projectId ?? ''}
          taskId={rows[picker.row]?.taskId ?? ''}
          workLocation={rows[picker.row]?.workLocation ?? ''}
          onSelectProject={(clientId, projectId) => selectProject(picker.row, clientId, projectId)}
          onSelectTask={(taskId) => {
            setBanner(null)
            clearRowFieldErrors(picker.row)
            setValue(`rows.${picker.row}.taskId`, taskId, { shouldValidate: false, shouldDirty: true })
          }}
          onSelectLocation={(location) => {
            setBanner(null)
            clearRowFieldErrors(picker.row)
            setValue(`rows.${picker.row}.workLocation`, location, { shouldValidate: false, shouldDirty: true })
          }}
          onBack={stepBack}
          onContinue={advancePicker}
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
    </form>
  )
}

export default ManualReport
