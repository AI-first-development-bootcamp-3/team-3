import { useEffect, useMemo, useState } from 'react'
import { App, Input, Select } from 'antd'
import { ApiError } from '../services/apiClient'
import { completeClock } from '../services/clock'
import { createReport, getReportingOptions } from '../services/reports'
import type { ClockSession } from '../types/clock'
import type { ReportingOptions, WorkLocation } from '../types'
import { projectFormat } from './ManualReport.schema'
import { LOCATION_OPTIONS } from './ManualReport.constants'
import { translateReportApiMessage } from '../lib/reportApiMessages'
import { attendanceTimesForSegment, clockReportTimeFields, totalSessionMinutes } from '../lib/workClock'
import './WorkClockStopModal.css'

interface Props {
  open: boolean
  session: ClockSession
  loading?: boolean
  onCancel: () => void
  onConfirmed: () => void
}

function hasAssignments(options: ReportingOptions | null): boolean {
  return Boolean(options?.clients.some((client) => client.projects.some((project) => project.tasks.length > 0)))
}

function formatDurationLabel(totalMinutes: number): string {
  if (totalMinutes <= 0) return 'פחות מדקה'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} דק׳`
  if (minutes === 0) return `${hours} שע׳`
  return `${hours} שע׳ ${minutes} דק׳`
}

function WorkClockStopModal({ open, session, loading = false, onCancel, onConfirmed }: Props) {
  const { notification } = App.useApp()
  const [options, setOptions] = useState<ReportingOptions | null>(null)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [workLocation, setWorkLocation] = useState<WorkLocation | ''>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getReportingOptions()
      .then((next) => {
        if (!cancelled) setOptions(next)
      })
      .catch(() => {
        if (!cancelled) setOptions(null)
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, session.sessionId])

  const tasks = useMemo(() => {
    return (
      options?.clients
        .find((client) => client.id === clientId)
        ?.projects.find((project) => project.id === projectId)?.tasks ?? []
    )
  }, [options, clientId, projectId])

  const projectKey = clientId && projectId ? `${clientId}:${projectId}` : undefined

  const projectOptions = useMemo(
    () =>
      (options?.clients ?? []).flatMap((client) =>
        client.projects.map((project) => ({
          value: `${client.id}:${project.id}`,
          label: project.name,
        })),
      ),
    [options],
  )

  const taskOptions = useMemo(
    () => tasks.map((task) => ({ value: task.id, label: task.name })),
    [tasks],
  )

  const locationOptions = useMemo(
    () => LOCATION_OPTIONS.map((location) => ({ value: location.value, label: location.label })),
    [],
  )

  const totalMinutes = totalSessionMinutes(session.segments)
  const canConfirm =
    hasAssignments(options) &&
    Boolean(clientId && projectId && taskId && workLocation) &&
    !submitting &&
    !loading

  const handleConfirm = async () => {
    if (!canConfirm || !workLocation) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const reportFormat = projectFormat(options, clientId, projectId)
      for (const segment of session.segments) {
        const window =
          reportFormat === 'CLOCK_IN_OUT'
            ? attendanceTimesForSegment(segment)
            : { startTime: segment.startTime, endTime: segment.endTime }
        await createReport({
          clientId,
          projectId,
          taskId,
          date: segment.date,
          workLocation,
          startTime: window.startTime,
          endTime: window.endTime,
          description: description.trim(),
          ...clockReportTimeFields(segment, reportFormat),
        })
      }
      await completeClock()
      notification.success({ message: 'הדיווח נשמר בהצלחה' })
      onConfirmed()
    } catch (error) {
      if (error instanceof ApiError) {
        const body = error.body as { error?: { message?: string; details?: { message?: string }[] } } | undefined
        const raw = body?.error?.details?.[0]?.message ?? body?.error?.message ?? 'לא ניתן לשמור את הדיווח'
        setSubmitError(translateReportApiMessage(raw))
      } else {
        setSubmitError('לא ניתן לשמור את הדיווח')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="work-clock-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="work-clock-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-clock-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="work-clock-modal__head">
          <div className="work-clock-modal__title-wrap">
            <h2 className="work-clock-modal__title" id="work-clock-modal-title">
              סיום שעון עבודה
            </h2>
            <p className="work-clock-modal__subtitle">בחרו פרויקט, משימה ומיקום לשמירת הדיווח</p>
          </div>
          <button type="button" className="work-clock-modal__close" aria-label="סגירה" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="work-clock-modal__body">
          {session.autoStopped ? (
            <p className="work-clock-modal__notice">
              השעון נעצר אוטומטית בסוף יום העבודה. השלימו את פרטי הדיווח כדי לשמור.
            </p>
          ) : null}

          <div className="work-clock-modal__duration">
            <span className="work-clock-modal__duration-label">זמן שעון</span>
            <div>
              <span className="work-clock-modal__duration-value">{formatDurationLabel(totalMinutes)}</span>
              {session.segments.length > 0 ? (
                <ul className="work-clock-modal__segments" aria-label="מקטעי זמן">
                  {session.segments.map((segment) => (
                    <li key={`${segment.date}-${segment.startTime}`}>
                      {segment.date} · {segment.startTime}–{segment.endTime}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {optionsLoading ? <p className="work-clock-modal__empty">טוען אפשרויות דיווח…</p> : null}

          {!optionsLoading && !hasAssignments(options) ? (
            <p className="work-clock-modal__empty">
              אין משימות מוקצות — פנו למנהל כדי לשייך משימות לפני שמירת הדיווח.
            </p>
          ) : null}

          {hasAssignments(options) ? (
            <>
              <div className="work-clock-modal__fields">
                <label className="work-clock-modal__field" htmlFor="work-clock-project">
                  <span className="work-clock-modal__field-label">פרויקט</span>
                  <Select
                    id="work-clock-project"
                    aria-label="פרויקט"
                    className="work-clock-modal__select"
                    popupClassName="work-clock-modal__select-dropdown"
                    placeholder="בחר פרויקט"
                    value={projectKey}
                    options={projectOptions}
                    placement="bottomRight"
                    getPopupContainer={() => document.body}
                    onChange={(value) => {
                      const [nextClientId = '', nextProjectId = ''] = String(value).split(':')
                      setClientId(nextClientId)
                      setProjectId(nextProjectId)
                      setTaskId('')
                      setWorkLocation('')
                    }}
                  />
                </label>

                <label className="work-clock-modal__field" htmlFor="work-clock-task">
                  <span className="work-clock-modal__field-label">משימה</span>
                  <Select
                    id="work-clock-task"
                    aria-label="משימה"
                    className="work-clock-modal__select"
                    popupClassName="work-clock-modal__select-dropdown"
                    placeholder="בחר משימה"
                    value={taskId || undefined}
                    options={taskOptions}
                    disabled={!projectId}
                    placement="bottomRight"
                    getPopupContainer={() => document.body}
                    onChange={(value) => {
                      setTaskId(String(value))
                      setWorkLocation('')
                    }}
                  />
                </label>

                <label className="work-clock-modal__field" htmlFor="work-clock-location">
                  <span className="work-clock-modal__field-label">מיקום</span>
                  <Select
                    id="work-clock-location"
                    aria-label="מיקום"
                    className="work-clock-modal__select"
                    popupClassName="work-clock-modal__select-dropdown"
                    placeholder="בחר מיקום"
                    value={workLocation || undefined}
                    options={locationOptions}
                    disabled={!taskId}
                    placement="bottomRight"
                    getPopupContainer={() => document.body}
                    onChange={(value) => setWorkLocation(value as WorkLocation)}
                  />
                </label>
              </div>

              <label className="work-clock-modal__description">
                <span className="work-clock-modal__description-label">
                  פירוט <em>(לא חובה)</em>
                </span>
                <Input
                  className="work-clock-modal__description-input"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="הוספת פירוט..."
                />
              </label>
            </>
          ) : null}

          {submitError ? <p className="work-clock-modal__error">{submitError}</p> : null}
        </div>

        <div className="work-clock-modal__actions">
          <button
            type="button"
            className="work-clock-modal__confirm"
            disabled={!canConfirm}
            onClick={() => void handleConfirm()}
          >
            {submitting ? 'שומר…' : 'שמירת דיווח'}
          </button>
          <button type="button" className="work-clock-modal__cancel" onClick={onCancel} disabled={submitting}>
            ביטול ללא שמירה
          </button>
        </div>
      </div>
    </div>
  )
}

export default WorkClockStopModal
