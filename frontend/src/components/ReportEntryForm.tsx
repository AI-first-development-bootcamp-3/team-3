import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, DatePicker, Form, Input, Select, TimePicker } from 'antd'
import dayjs from 'dayjs'
import { getReportingOptions } from '../services/reports'
import type { ReportingOptions, WorkLocation } from '../types'
import { reportEntryFormSchema, type ReportEntryFormValues } from './ReportEntryForm.schema'

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

function ReportEntryForm() {
  const [options, setOptions] = useState<ReportingOptions | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ReportEntryFormValues>({
    resolver: zodResolver(reportEntryFormSchema),
    defaultValues: freshDefaults(),
  })

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

  const onSubmit = () => {
    // Persistence is wired in SCRUM-123.
  }

  if (loadError) {
    return <Alert type="error" message={loadError} showIcon />
  }

  if (!options) {
    return <p>טוען…</p>
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <h1>דיווח שעות</h1>

      {!hasHierarchy && (
        <Alert
          type="info"
          message="אין משימות זמינות לדיווח"
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <Form.Item label="תאריך" htmlFor="date" validateStatus={errors.date ? 'error' : ''} help={errors.date?.message}>
        <Controller
          name="date"
          control={control}
          render={({ field }) => (
            <DatePicker
              id="date"
              aria-label="תאריך"
              format="YYYY-MM-DD"
              value={field.value ? dayjs(field.value) : null}
              onChange={(value) => field.onChange(value ? value.format('YYYY-MM-DD') : '')}
              style={{ width: '100%' }}
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
              placeholder="בחרו מיקום"
              options={LOCATION_OPTIONS}
              value={field.value || undefined}
              onChange={field.onChange}
              allowClear
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="התחלה"
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
              aria-label="התחלה"
              format={TIME_FORMAT}
              value={field.value ? dayjs(field.value, TIME_FORMAT) : null}
              onChange={(value) => field.onChange(value ? value.format(TIME_FORMAT) : '')}
              style={{ width: '100%' }}
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="סיום"
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
              aria-label="סיום"
              format={TIME_FORMAT}
              value={field.value ? dayjs(field.value, TIME_FORMAT) : null}
              onChange={(value) => field.onChange(value ? value.format(TIME_FORMAT) : '')}
              style={{ width: '100%' }}
            />
          )}
        />
      </Form.Item>

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
              placeholder="בחרו לקוח"
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
              placeholder="בחרו פרויקט"
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
              placeholder="בחרו משימה"
              options={tasks.map((task) => ({ value: task.id, label: task.name }))}
              value={field.value || undefined}
              onChange={(value) => field.onChange(value ?? '')}
              disabled={!projectId}
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="פירוט"
        htmlFor="description"
        validateStatus={errors.description ? 'error' : ''}
        help={errors.description?.message}
      >
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Input.TextArea {...field} id="description" aria-label="פירוט" rows={3} />
          )}
        />
      </Form.Item>

      <Button type="primary" htmlType="submit" disabled={!hasHierarchy}>
        שמירה
      </Button>
    </Form>
  )
}

export default ReportEntryForm
