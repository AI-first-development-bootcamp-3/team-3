import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { App, DatePicker, Select } from 'antd'
import dayjs from '../services/dayjs'
import { ApiError } from '../services/apiClient'
import { createAbsence } from '../services/absences'
import type { AbsenceType } from '../types'
import { ABSENCE_TYPE_ROWS, manualAbsenceSchema, type ManualAbsenceValues } from './ManualAbsence.schema'
import { CloseMark, WarningTriangle } from './ManualReportIcons'
import closeIcon from '../assets/manual-report/close.svg'
import './ManualReport.css'
import './ManualAbsence.css'

const MISSING_DETAILS = {
  title: 'חסר לנו פרט או שניים',
  detail: 'מלא את כל הנתונים הדרושים כדי שנוכל לשמור את הדיווח בהצלחה.',
}
const CONFLICT = {
  title: 'התאריכים חופפים לדיווח קיים',
  detail: 'בדקו את התאריכים המסומנים למטה ונסו שוב.',
}
const TOO_MANY_SAVES = {
  title: 'שמרתם יותר מדי פעמים ברצף',
  detail: 'המתינו כמה דקות ונסו לשמור את הדיווח שוב.',
}
const SAVE_FAILED = {
  title: 'משהו השתבש. נסו שוב.',
  detail: 'לא הצלחנו לשמור את הדיווח. בדקו את החיבור ונסו שוב.',
}

/** 400s from `createAbsenceBodySchema` key by these form field names; 409 conflicts key by an ISO date instead. */
const FORM_FIELDS = new Set(['type', 'startDate', 'endDate'])

interface Props {
  onClose: () => void
  /** Omitted on the standalone /absences route, where there's no sibling Work tab to switch to. */
  onSwitchToWork?: () => void
}

interface ApiFieldError {
  field: string
  message: string
}

function freshValues(): ManualAbsenceValues {
  return {
    type: '',
    halfDay: false,
    isRange: false,
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: undefined,
  }
}

function formatDay(date: string): string {
  const day = dayjs(date)
  return day.isValid() ? `יום ${day.format('dd')} ${day.format('DD/MM/YY')}` : date
}

/**
 * Mirrors the backend's `expandWorkingDays` Sun-Thu rule for an instant
 * pre-submit preview. The `POST /absences` response's own count is what's
 * confirmed after a successful save - this is a preview only, see
 * openspec/changes/absences-employee-report/design.md Decisions.
 */
function previewWorkingDays(startISO: string, endISO: string): number {
  const start = dayjs(startISO)
  const end = dayjs(endISO)
  if (!start.isValid() || !end.isValid() || end.isBefore(start, 'day')) return 0

  let count = 0
  let cursor = start
  while (!cursor.isAfter(end, 'day')) {
    const weekday = cursor.day() // 0 = Sunday ... 6 = Saturday
    if (weekday !== 5 && weekday !== 6) count += 1
    cursor = cursor.add(1, 'day')
  }
  return count
}

function formatWorkingDays(count: number): string {
  return count === 1 ? '1 יום עבודה' : `${count} ימי עבודה`
}

function apiFieldErrors(body: unknown): ApiFieldError[] {
  if (!body || typeof body !== 'object' || !('error' in body)) return []
  const error = (body as { error?: { details?: ApiFieldError[] } }).error
  return (error?.details ?? []).filter(
    (detail): detail is ApiFieldError => typeof detail.field === 'string' && typeof detail.message === 'string',
  )
}

/**
 * The דיווח היעדרות tab of the דיווח ידני screen - sibling to ManualReport's
 * דיווח עבודה tab (same Figma file: "⏰ Time report files ⏰"). The mock also
 * shows a supporting-document attach zone on this card; that's SCRUM-148's
 * scope (attachment upload has no absenceId wiring yet) and is deliberately
 * not built here - see design.md Decisions.
 */
function ManualAbsence({ onClose, onSwitchToWork }: Props) {
  const { message } = App.useApp()
  const [banner, setBanner] = useState<{ title: string; detail: string } | null>(null)
  const [dateConflicts, setDateConflicts] = useState<ApiFieldError[]>([])

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualAbsenceValues>({
    resolver: zodResolver(manualAbsenceSchema),
    defaultValues: freshValues(),
  })

  const values = useWatch({ control })
  const type = values.type ?? ''
  const halfDay = values.halfDay ?? false
  const isRange = values.isRange ?? false
  const startDate = values.startDate ?? ''
  const endDate = values.endDate

  const selectedRow = ABSENCE_TYPE_ROWS.find((row) => row.type === type && row.halfDay === halfDay)

  const workingDaysCount = useMemo(
    () => previewWorkingDays(startDate, isRange ? (endDate ?? startDate) : startDate),
    [startDate, endDate, isRange],
  )

  const chooseType = (row: (typeof ABSENCE_TYPE_ROWS)[number]) => {
    setValue('type', row.type, { shouldValidate: true })
    setValue('halfDay', row.halfDay)
  }

  const toggleRange = () => {
    setValue('isRange', !isRange)
    if (isRange) setValue('endDate', undefined)
  }

  const onSubmit = async (formValues: ManualAbsenceValues) => {
    setBanner(null)
    setDateConflicts([])
    try {
      const absence = await createAbsence({
        type: formValues.type as AbsenceType,
        startDate: formValues.startDate,
        endDate: formValues.isRange ? formValues.endDate : undefined,
        halfDay: formValues.halfDay,
      })
      message.success(`הדיווח נשמר בהצלחה (${formatWorkingDays(absence.workingDaysCount)})`)
      reset(freshValues())
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
        const details = apiFieldErrors(error.body)
        const conflicts: ApiFieldError[] = []
        for (const detail of details) {
          if (FORM_FIELDS.has(detail.field)) {
            setError(detail.field as keyof ManualAbsenceValues, { message: detail.message })
          } else {
            conflicts.push(detail)
          }
        }
        setDateConflicts(conflicts)
        setBanner(error.status === 409 ? CONFLICT : MISSING_DETAILS)
        return
      }
      setBanner(error instanceof ApiError && error.status === 429 ? TOO_MANY_SAVES : SAVE_FAILED)
    }
  }

  const onInvalid = () => setBanner(MISSING_DETAILS)

  return (
    <form className="manual-report" onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
      <header className="manual-report__header">
        <h1 className="manual-report__title">דיווח ידני</h1>
        <button type="button" className="manual-report__close" onClick={onClose} aria-label="סגירה">
          <img src={closeIcon} alt="" width={11} height={11} />
        </button>
      </header>

      <div className="manual-report__body">
        <div className="manual-report__segmented" role="tablist" aria-label="סוג דיווח">
          <button
            type="button"
            role="tab"
            className="manual-report__segment"
            aria-selected="false"
            disabled={!onSwitchToWork}
            onClick={onSwitchToWork}
          >
            דיווח עבודה
          </button>
          <button type="button" role="tab" className="manual-report__segment" aria-selected="true">
            דיווח היעדרות
          </button>
        </div>

        {banner && (
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
        )}

        <div className="mr-card">
          <div className="mr-cell ma-type-cell">
            <span className="mr-cell__label">
              סוג היעדרות
              {errors.type && <span className="mr-cell__required"> *</span>}
            </span>
            <span className="mr-cell__value">
              <Select
                className="ma-type-select"
                value={selectedRow ? `${selectedRow.type}-${selectedRow.halfDay}` : undefined}
                onChange={(value) => {
                  const row = ABSENCE_TYPE_ROWS.find((r) => `${r.type}-${r.halfDay}` === value)
                  if (row) chooseType(row)
                }}
                placeholder="בחירה"
                options={ABSENCE_TYPE_ROWS.map((row) => ({
                  label: `${row.emoji} ${row.label}`,
                  value: `${row.type}-${row.halfDay}`,
                }))}
                optionLabelProp="label"
              />
            </span>
          </div>
        </div>
        {errors.type && <p className="mr-cell__error">{errors.type.message}</p>}

        <div className="mr-card">
          <div className="mr-cell ma-date-cell">
            <span className="mr-cell__label">{isRange ? 'תאריך התחלה' : 'תאריך'}</span>
            <span className="mr-cell__value">
              <DatePicker
                className="ma-date-picker"
                variant="borderless"
                aria-label={isRange ? 'תאריך התחלה' : 'תאריך'}
                value={startDate ? dayjs(startDate) : null}
                format="DD/MM/YYYY"
                allowClear={false}
                onChange={(value) => {
                  setValue('startDate', value ? value.format('YYYY-MM-DD') : '', { shouldValidate: true })
                  // A previously-picked endDate may now be invalid against the new
                  // startDate, and RHF's per-field trigger above doesn't re-surface
                  // the cross-field refine live. Reset it instead of leaving a
                  // stale, silently-invalid combination - see design.md Decisions.
                  if (isRange) setValue('endDate', undefined, { shouldValidate: true })
                }}
              />
            </span>
          </div>
          {isRange && (
            <div className="mr-cell ma-date-cell">
              <span className="mr-cell__label">תאריך סיום</span>
              <span className="mr-cell__value">
                <DatePicker
                  className="ma-date-picker"
                  variant="borderless"
                  aria-label="תאריך סיום"
                  value={endDate ? dayjs(endDate) : null}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  onChange={(value) =>
                    setValue('endDate', value ? value.format('YYYY-MM-DD') : undefined, { shouldValidate: true })
                  }
                />
              </span>
            </div>
          )}
        </div>
        {errors.startDate && <p className="mr-cell__error">{errors.startDate.message}</p>}
        {errors.endDate && <p className="mr-cell__error">{errors.endDate.message}</p>}

        <p className="ma-duration">
          משך ימי דיווח: {workingDaysCount} {workingDaysCount === 1 ? 'יום' : 'ימים'}
        </p>

        {dateConflicts.length > 0 && (
          <ul className="ma-conflicts" role="alert">
            {dateConflicts.map((conflict) => (
              <li key={`${conflict.field}-${conflict.message}`}>
                {formatDay(conflict.field)}: {conflict.message}
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="ma-range-toggle" onClick={toggleRange}>
          {isRange ? 'דיווח ליום בודד' : 'לדווח על היעדרות ליותר מיום אחד'}
        </button>
      </div>

      <footer className="manual-report__footer">
        <button type="submit" className="manual-report__save" disabled={isSubmitting}>
          שמירה
        </button>
      </footer>

    </form>
  )
}

export default ManualAbsence