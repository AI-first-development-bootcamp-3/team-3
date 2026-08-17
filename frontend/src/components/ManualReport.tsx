import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
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
import addCircle from '../assets/manual-report/add-circle.svg'
import closeIcon from '../assets/manual-report/close.svg'
import schedule from '../assets/manual-report/schedule.svg'
import './ManualReport.css'

const STANDARD_HOURS = 9
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const NEXT_STEP: Record<PickerStep, PickerStep | null> = {
  project: 'task',
  task: 'location',
  location: null,
}

interface Props {
  onClose: () => void
}

function emptyRow(startTime: string, endTime: string): ProjectRowValues {
  return { clientId: '', projectId: '', taskId: '', workLocation: '', startTime, endTime, description: '' }
}

function freshDay(): ManualReportValues {
  const now = dayjs()
  return {
    date: now.format('YYYY-MM-DD'),
    dayStart: now.format('HH:mm'),
    dayEnd: now.format('HH:mm'),
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

function formatDay(date: string): string {
  const day = dayjs(date)
  return day.isValid() ? `יום ${day.format('ddd')} ${day.format('DD/MM/YY')}` : ''
}

function apiFieldErrors(body: unknown): { field: string; message: string }[] {
  if (!body || typeof body !== 'object' || !('error' in body)) return []
  const error = (body as { error?: { details?: { field?: string; message?: string }[] } }).error
  return (error?.details ?? []).filter(
    (detail): detail is { field: string; message: string } =>
      typeof detail.field === 'string' && typeof detail.message === 'string',
  )
}

/**
 * The דיווח ידני screen: one attendance window plus any number of project
 * cards, saved together. Figma frames 1:1621 (empty) and 1:4352 (with a card).
 */
function ManualReport({ onClose }: Props) {
  const { message } = App.useApp()
  const [options, setOptions] = useState<ReportingOptions | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [picker, setPicker] = useState<{ row: number; step: PickerStep } | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<number | null>(null)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualReportValues>({
    resolver: zodResolver(manualReportSchema),
    defaultValues: freshDay(),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'rows' })
  const day = useWatch({ control })
  const rows = useMemo(() => (day.rows ?? []) as ProjectRowValues[], [day.rows])

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

  const reported = useMemo(
    () => rows.reduce((total, row) => total + hoursBetween(row.startTime, row.endTime), 0),
    [rows],
  )
  const remaining = Math.max(STANDARD_HOURS - reported, 0)
  const hasHierarchy = (options?.clients.length ?? 0) > 0

  const rowErrors = (index: number): RowErrors => {
    const issues = errors.rows?.[index]
    if (!issues) return {}
    return {
      projectId: issues.projectId?.message,
      taskId: issues.taskId?.message,
      workLocation: issues.workLocation?.message,
      startTime: issues.startTime?.message,
      endTime: issues.endTime?.message,
      description: issues.description?.message,
    }
  }

  const addRow = () => {
    setBanner(null)
    append(emptyRow(day.dayStart ?? '09:00', day.dayEnd ?? '18:00'))
    setPicker({ row: fields.length, step: 'project' })
  }

  const selectProject = (index: number, clientId: string, projectId: string) => {
    setValue(`rows.${index}.clientId`, clientId, { shouldValidate: false })
    setValue(`rows.${index}.projectId`, projectId, { shouldValidate: false })
    const tasks =
      options?.clients
        .find((client) => client.id === clientId)
        ?.projects.find((project) => project.id === projectId)?.tasks ?? []
    // One task means there is nothing to choose; the step still shows it as selected.
    setValue(`rows.${index}.taskId`, tasks.length === 1 && tasks[0] ? tasks[0].id : '')
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
    // Task cannot be chosen before its project, so fall back to the first step.
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
      reset(freshDay())
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        const details = apiFieldErrors(error.body)
        for (const detail of details) {
          setError(detail.field as keyof ManualReportValues, { message: detail.message })
        }
        setBanner('חסר לנו פרט או שניים')
        return
      }
      setBanner('משהו השתבש. נסו שוב.')
    }
  }

  const onInvalid = () => setBanner('חסר לנו פרט או שניים')

  if (loadError) {
    return (
      <div className="manual-report">
        <header className="manual-report__header">
          <h1 className="manual-report__title">דיווח ידני</h1>
          <button type="button" className="manual-report__close" onClick={onClose} aria-label="סגירה">
            <img src={closeIcon} alt="" width={11} height={11} />
          </button>
        </header>
        <div className="manual-report__body">
          <p className="manual-report__empty">{loadError}</p>
        </div>
      </div>
    )
  }

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
          <button type="button" role="tab" className="manual-report__segment" aria-selected="true">
            דיווח עבודה
          </button>
          <button
            type="button"
            role="tab"
            className="manual-report__segment"
            aria-selected="false"
            disabled
          >
            דיווח היעדרות
          </button>
        </div>

        {banner && (
          <div className="manual-report__banner" role="alert">
            <span className="manual-report__banner-icon">
              <WarningTriangle />
            </span>
            <div className="manual-report__banner-text">
              <h2>{banner}</h2>
              <p>מלא את כל הנתונים הדרושים כדי שנוכל לשמור את הדיווח בהצלחה.</p>
            </div>
            <button type="button" onClick={() => setBanner(null)} aria-label="סגירת ההודעה">
              <CloseMark />
            </button>
          </div>
        )}

        <section className="manual-report__section">
          <div className="manual-report__day-head">
            <p className="manual-report__date">{formatDay(day.date ?? '')}</p>
            {fields.length > 0 && (
              <span className="manual-report__quota">
                <img src={schedule} alt="" width={10} height={10} />
                תקן יומי {STANDARD_HOURS} שע׳
              </span>
            )}
          </div>

          <div className="mr-card">
            <label className="mr-cell">
              <span className="mr-cell__label">כניסה</span>
              <span className="mr-cell__value">
                <input type="time" className="mr-cell__time" aria-label="כניסה" {...register('dayStart')} />
              </span>
            </label>
            <label className="mr-cell">
              <span className="mr-cell__label">יציאה</span>
              <span className="mr-cell__value">
                <input type="time" className="mr-cell__time" aria-label="יציאה" {...register('dayEnd')} />
              </span>
            </label>
          </div>
          {errors.dayEnd && <p className="mr-cell__error">{errors.dayEnd.message}</p>}
        </section>

        {fields.length > 0 && <h2 className="manual-report__section-title">דיווח פרויקטים</h2>}

        {options &&
          fields.map((field, index) => (
            <ManualReportProjectCard
              key={field.id}
              index={index}
              values={rows[index] ?? emptyRow('', '')}
              options={options}
              errors={rowErrors(index)}
              register={register}
              onPick={(step) => openPicker(index, step)}
              onRemove={() => setPendingRemoval(index)}
            />
          ))}

        {!hasHierarchy && options && (
          <p className="manual-report__empty">אין מידע זמין כרגע, נסו שוב מאוחר יותר או פנו למנהל ישיר</p>
        )}

        <button type="button" className="manual-report__add" onClick={addRow} disabled={!hasHierarchy}>
          <img src={addCircle} alt="" width={24} height={24} />
          הוספת פרויקט
        </button>

        {errors.rows?.message && <p className="mr-cell__error">{errors.rows.message}</p>}
      </div>

      <footer className="manual-report__footer">
        <div className="manual-report__progress">
          <div className="manual-report__progress-labels">
            <span>
              {formatHours(reported)} מתוך {STANDARD_HOURS} שעות
            </span>
            <span>{remaining > 0 ? `חסרות ${formatHours(remaining)} שעות לדיווח` : 'הדיווח הושלם'}</span>
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

      {picker && options && (
        <ManualReportPicker
          step={picker.step}
          options={options}
          clientId={rows[picker.row]?.clientId ?? ''}
          projectId={rows[picker.row]?.projectId ?? ''}
          taskId={rows[picker.row]?.taskId ?? ''}
          workLocation={rows[picker.row]?.workLocation ?? ''}
          onSelectProject={(clientId, projectId) => selectProject(picker.row, clientId, projectId)}
          onSelectTask={(taskId) => setValue(`rows.${picker.row}.taskId`, taskId)}
          onSelectLocation={(location) => setValue(`rows.${picker.row}.workLocation`, location)}
          onBack={stepBack}
          onContinue={advancePicker}
        />
      )}

      {pendingRemoval !== null && (
        <ManualReportDeleteDialog
          onCancel={() => setPendingRemoval(null)}
          onConfirm={() => {
            remove(pendingRemoval)
            setPendingRemoval(null)
          }}
        />
      )}
    </form>
  )
}

export default ManualReport
