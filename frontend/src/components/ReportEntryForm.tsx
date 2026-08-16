import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Button, DatePicker, Form, Input, Select, TimePicker } from 'antd'
import dayjs from 'dayjs'
import { ApiError } from '../services/apiClient'
import { createReport, getReportingOptions } from '../services/reports'
import type { ReportingOptions, WorkLocation } from '../types'
import { reportEntryFormSchema, type ReportEntryFormValues } from './ReportEntryForm.schema'
import './ReportEntryForm.css'

const TIME_FORMAT = 'HH:mm'

const LOCATION_OPTIONS: { value: WorkLocation; label: string }[] = [
  { value: 'OFFICE', label: 'משרד' },
  { value: 'CLIENT', label: 'לקוח' },
  { value: 'HOME', label: 'בית' },
]

function freshDefaults(): ReportEntryFormValues {
  const now = dayjs()
  return {
    date: now.format('YYYY-MM-DD'),
    workLocation: '',
    startTime: now.format(TIME_FORMAT),
    endTime: now.format(TIME_FORMAT),
    clientId: '',
    projectId: '',
    taskId: '',
    description: '',
  }
}

function formatReportDate(value: string): string {
  const date = dayjs(value)
  if (!date.isValid()) return ''
  return `יום ${date.format('dd')} ${date.format('DD/MM/YY')}`
}

function apiFieldErrors(body: unknown): { field: string; message: string }[] {
  if (!body || typeof body !== 'object' || !('error' in body)) return []
  const error = (body as { error?: { details?: { field?: string; message?: string }[] } }).error
  if (!error?.details) return []
  return error.details.filter(
    (detail): detail is { field: string; message: string } =>
      typeof detail.field === 'string' && typeof detail.message === 'string',
  )
}

function ReportEntryForm() {
  const { message } = App.useApp()
  const [options, setOptions] = useState<ReportingOptions | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportEntryFormValues>({
    resolver: zodResolver(reportEntryFormSchema),
    defaultValues: freshDefaults(),
  })

  const date = useWatch({ control, name: 'date' })
  const clientId = useWatch({ control, name: 'clientId' })
  const projectId = useWatch({ control, name: 'projectId' })
  const taskId = useWatch({ control, name: 'taskId' })

  useEffect(() => {
    let cancelled = false
    getReportingOptions()
      .then((tree) => {
        if (!cancelled) setOptions(tree)
      })
      .catch(() => {
        if (!cancelled) setLoadError('לא ניתן לטעון לקוחות ומשימות. נסו שוב.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const projects = useMemo(() => {
    return options?.clients.find((client) => client.id === clientId)?.projects ?? []
  }, [options, clientId])

  const tasks = useMemo(() => {
    return projects.find((project) => project.id === projectId)?.tasks ?? []
  }, [projects, projectId])

  useEffect(() => {
    if (!options) return
    if (options.clients.length === 1 && options.clients[0]) {
      setValue('clientId', options.clients[0].id)
    }
  }, [options, setValue])

  useEffect(() => {
    if (projects.length === 1 && projects[0]) {
      setValue('projectId', projects[0].id)
      return
    }
    if (projectId && !projects.some((project) => project.id === projectId)) {
      setValue('projectId', '')
      setValue('taskId', '')
    }
  }, [projects, projectId, setValue])

  useEffect(() => {
    if (tasks.length === 1 && tasks[0]) {
      setValue('taskId', tasks[0].id)
      return
    }
    if (taskId && !tasks.some((task) => task.id === taskId)) {
      setValue('taskId', '')
    }
  }, [tasks, taskId, setValue])

  const hasHierarchy = (options?.clients.length ?? 0) > 0

  const onSubmit = async (values: ReportEntryFormValues) => {
    setFormError(null)
    try {
      await createReport({
        date: values.date,
        workLocation: values.workLocation as WorkLocation,
        startTime: values.startTime,
        endTime: values.endTime,
        clientId: values.clientId,
        projectId: values.projectId,
        taskId: values.taskId,
        description: values.description,
      })
      message.success('הדיווח נשמר בהצלחה')
      const next = freshDefaults()
      reset(next)
      if (options?.clients.length === 1 && options.clients[0]) {
        setValue('clientId', options.clients[0].id)
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        const details = apiFieldErrors(error.body)
        if (details.length === 0) {
          setFormError('לא ניתן לשמור את הדיווח. בדקו את השדות.')
          return
        }
        for (const detail of details) {
          if (detail.field in values) {
            setError(detail.field as keyof ReportEntryFormValues, { message: detail.message })
          }
        }
        return
      }
      setFormError('משהו השתבש. נסו שוב.')
    }
  }

  if (loadError) {
    return (
      <div className="report-entry">
        <header className="report-entry__header">
          <p className="report-entry__mode">דיווח ידני</p>
          <p className="report-entry__quota">תקן יומי 9 שע׳</p>
        </header>
        <Alert type="error" message={loadError} showIcon />
      </div>
    )
  }

  if (!options) {
    return (
      <div className="report-entry">
        <p>טוען…</p>
      </div>
    )
  }

  return (
    <div className="report-entry">
      <header className="report-entry__header">
        <p className="report-entry__mode">דיווח ידני</p>
        <p className="report-entry__quota">תקן יומי 9 שע׳</p>
      </header>

      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        {formError && <Alert type="error" message={formError} showIcon style={{ marginBottom: 16 }} />}

        {!hasHierarchy && (
          <Alert
            type="info"
            message="אופססס... 😅"
            description="אין מידע זמין כרגע, נסה שוב מאוחר יותר או פנה למנהל ישיר"
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        <p className="report-entry__date-label">{formatReportDate(date) || 'תאריך'}</p>
        <Form.Item htmlFor="date" validateStatus={errors.date ? 'error' : ''} help={errors.date?.message}>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                id="date"
                aria-label="תאריך"
                format="DD/MM/YY"
                allowClear={false}
                value={field.value ? dayjs(field.value) : null}
                onChange={(value) => field.onChange(value ? value.format('YYYY-MM-DD') : '')}
              />
            )}
          />
        </Form.Item>

        <div className="report-entry__times">
          <Form.Item
            label="כניסה"
            htmlFor="startTime"
            validateStatus={errors.startTime ? 'error' : ''}
            help={errors.startTime?.message}
          >
            <Controller
              name="startTime"
              control={control}
              render={({ field }) => (
                <TimePicker
                  id="startTime"
                  aria-label="כניסה"
                  format={TIME_FORMAT}
                  needConfirm={false}
                  value={field.value ? dayjs(field.value, TIME_FORMAT) : null}
                  onChange={(value) => field.onChange(value ? value.format(TIME_FORMAT) : '')}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="יציאה"
            htmlFor="endTime"
            validateStatus={errors.endTime ? 'error' : ''}
            help={errors.endTime?.message}
          >
            <Controller
              name="endTime"
              control={control}
              render={({ field }) => (
                <TimePicker
                  id="endTime"
                  aria-label="יציאה"
                  format={TIME_FORMAT}
                  needConfirm={false}
                  value={field.value ? dayjs(field.value, TIME_FORMAT) : null}
                  onChange={(value) => field.onChange(value ? value.format(TIME_FORMAT) : '')}
                />
              )}
            />
          </Form.Item>
        </div>

        <section className="report-entry__projects">
          <h2 className="report-entry__projects-title">דיווח פרויקטים</h2>

          <Form.Item
            label="לקוח"
            htmlFor="clientId"
            validateStatus={errors.clientId ? 'error' : ''}
            help={errors.clientId?.message}
          >
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <Select
                  id="clientId"
                  aria-label="לקוח"
                  placeholder="בחירה"
                  options={options.clients.map((client) => ({ value: client.id, label: client.name }))}
                  value={field.value || undefined}
                  onChange={(value) => {
                    field.onChange(value ?? '')
                    setValue('projectId', '')
                    setValue('taskId', '')
                  }}
                  disabled={!hasHierarchy}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="פרויקט"
            htmlFor="projectId"
            validateStatus={errors.projectId ? 'error' : ''}
            help={errors.projectId?.message}
          >
            <Controller
              name="projectId"
              control={control}
              render={({ field }) => (
                <Select
                  id="projectId"
                  aria-label="פרויקט"
                  placeholder="בחירה"
                  options={projects.map((project) => ({ value: project.id, label: project.name }))}
                  value={field.value || undefined}
                  onChange={(value) => {
                    field.onChange(value ?? '')
                    setValue('taskId', '')
                  }}
                  disabled={!clientId}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="משימה"
            htmlFor="taskId"
            validateStatus={errors.taskId ? 'error' : ''}
            help={errors.taskId?.message}
          >
            <Controller
              name="taskId"
              control={control}
              render={({ field }) => (
                <Select
                  id="taskId"
                  aria-label="משימה"
                  placeholder="בחירה"
                  options={tasks.map((task) => ({ value: task.id, label: task.name }))}
                  value={field.value || undefined}
                  onChange={(value) => field.onChange(value ?? '')}
                  disabled={!projectId}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="מיקום"
            htmlFor="workLocation"
            validateStatus={errors.workLocation ? 'error' : ''}
            help={errors.workLocation?.message}
          >
            <Controller
              name="workLocation"
              control={control}
              render={({ field }) => (
                <Select
                  id="workLocation"
                  aria-label="מיקום"
                  placeholder="בחירה"
                  options={LOCATION_OPTIONS}
                  value={field.value || undefined}
                  onChange={field.onChange}
                  allowClear
                />
              )}
            />
          </Form.Item>

          <Form.Item
            htmlFor="description"
            validateStatus={errors.description ? 'error' : ''}
            help={errors.description?.message}
          >
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  id="description"
                  aria-label="פירוט"
                  placeholder="הוספת פירוט..."
                  rows={3}
                />
              )}
            />
          </Form.Item>
        </section>

        <Button
          className="report-entry__save"
          type="primary"
          htmlType="submit"
          loading={isSubmitting}
          disabled={!hasHierarchy}
        >
          שמירה
        </Button>
      </Form>
    </div>
  )
}

export default ReportEntryForm
