import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { App } from 'antd'
import { ApiError } from '../services/apiClient'
import { createAbsence } from '../services/absences'
import { countWorkingDays } from '../lib/workingDays'
import {
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPES,
  absenceReportSchema,
  type AbsenceReportValues,
} from './AbsenceReport.schema'

interface Props {
  onClose: () => void
  onSaved?: () => void
  defaultStartDate?: string
}

function conflictCopy(body: unknown): { title: string; detail: string } {
  const details = (body as { error?: { details?: { field?: string; message?: string }[] } } | undefined)?.error
    ?.details
  const dates = (details ?? []).map((detail) => detail.field).filter((field): field is string => Boolean(field))
  const uniqueDates = [...new Set(dates)]
  return {
    title: 'התאריכים מתנגשים עם דיווח קיים',
    detail:
      uniqueDates.length > 0
        ? `לא ניתן לשמור היעדרות בתאריכים: ${uniqueDates.join(', ')}`
        : 'התאריכים האלה כבר מדווחים כהיעדרות או כשעות עבודה.',
  }
}

function AbsenceReportForm({ onClose, onSaved, defaultStartDate = '' }: Props) {
  const { message } = App.useApp()
  const [banner, setBanner] = useState<{ title: string; detail: string } | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useForm<AbsenceReportValues>({
    resolver: zodResolver(absenceReportSchema),
    defaultValues: { type: '', startDate: defaultStartDate, endDate: '' },
  })
  const startDate = useWatch({ control, name: 'startDate' }) ?? ''
  const endDate = useWatch({ control, name: 'endDate' }) ?? ''
  const workingDays = useMemo(
    () => countWorkingDays(startDate, endDate || startDate),
    [startDate, endDate],
  )

  const onSubmit = async (values: AbsenceReportValues) => {
    setBanner(null)
    try {
      await createAbsence({
        type: values.type as Exclude<AbsenceReportValues['type'], ''>,
        startDate: values.startDate,
        endDate: values.endDate || values.startDate,
      })
      message.success('ההיעדרות נשמרה בהצלחה')
      onSaved?.()
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setBanner(conflictCopy(error.body))
        return
      }
      if (error instanceof ApiError && error.status === 400) {
        setBanner({
          title: 'לא ניתן לשמור את ההיעדרות',
          detail: 'בדקו את סוג ההיעדרות ואת התאריכים. טווח שמכיל רק שישי–שבת לא נספר.',
        })
        return
      }
      if (error instanceof ApiError && error.status === 429) {
        setBanner({
          title: 'שמרתם יותר מדי פעמים ברצף',
          detail: 'המתינו כמה דקות ונסו לשמור שוב.',
        })
        return
      }
      setBanner({
        title: 'משהו השתבש. נסו שוב.',
        detail: 'לא הצלחנו לשמור את ההיעדרות. בדקו את החיבור ונסו שוב.',
      })
    }
  }

  return (
    <form className="absence-report" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="absence-report__fields">
        <label className="manual-report__field">
          <span className="manual-report__field-label">סוג היעדרות</span>
          <select className="mr-project--desktop__select" aria-label="סוג היעדרות" {...register('type')}>
            <option value="" disabled>
              בחר
            </option>
            {ABSENCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {ABSENCE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          {errors.type ? <p className="manual-report__field-error">{errors.type.message}</p> : null}
        </label>
        <label className="manual-report__field">
          <span className="manual-report__field-label">מתאריך</span>
          <input type="date" className="manual-report__field-input" aria-label="מתאריך" {...register('startDate')} />
          {errors.startDate ? <p className="manual-report__field-error">{errors.startDate.message}</p> : null}
        </label>
        <label className="manual-report__field">
          <span className="manual-report__field-label">עד תאריך</span>
          <input type="date" className="manual-report__field-input" aria-label="עד תאריך" {...register('endDate')} />
          {errors.endDate ? <p className="manual-report__field-error">{errors.endDate.message}</p> : null}
        </label>
      </div>
      <p className="absence-report__count" data-testid="working-day-count">
        {startDate ? `${workingDays} ימי עבודה` : 'בחרו תאריכים כדי לראות כמה ימי עבודה נספרים'}
      </p>
      {banner ? (
        <div className="manual-report__banner" role="alert">
          <div className="manual-report__banner-text">
            <h2>{banner.title}</h2>
            <p>{banner.detail}</p>
          </div>
        </div>
      ) : null}
      <button type="submit" className="manual-report__save" disabled={isSubmitting}>
        שמירה
      </button>
    </form>
  )
}

export default AbsenceReportForm
