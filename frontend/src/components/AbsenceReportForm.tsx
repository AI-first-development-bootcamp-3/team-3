import { useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { App } from 'antd'
import { ApiError } from '../services/apiClient'
import { createAbsence, updateAbsence, uploadAttachment, type AttachmentMetadata } from '../services/absences'
import { countWorkingDays } from '../lib/workingDays'
import type { Absence } from '../types'
import {
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPES,
  absenceReportSchema,
  type AbsenceReportInput,
  type AbsenceReportValues,
} from './AbsenceReport.schema'

interface Props {
  onClose: () => void
  onSaved?: () => void
  defaultStartDate?: string
  existingAbsence?: Absence
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

function AbsenceReportForm({ onClose, onSaved, defaultStartDate = '', existingAbsence }: Props) {
  const { message } = App.useApp()
  const [banner, setBanner] = useState<{ title: string; detail: string } | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<AttachmentMetadata[]>(existingAbsence?.attachments ?? [])
  const [isUploading, setIsUploading] = useState(false)
  const [isMultiDay, setIsMultiDay] = useState(
    existingAbsence ? existingAbsence.startDate !== existingAbsence.endDate : false,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useForm<AbsenceReportInput, unknown, AbsenceReportValues>({
    resolver: zodResolver(absenceReportSchema),
    defaultValues: {
      type: existingAbsence?.type ?? '',
      startDate: existingAbsence?.startDate ?? defaultStartDate,
      endDate: existingAbsence && existingAbsence.startDate !== existingAbsence.endDate ? existingAbsence.endDate : '',
      documents: [],
    },
  })
  const startDate = useWatch({ control, name: 'startDate' }) ?? ''
  const endDate = useWatch({ control, name: 'endDate' }) ?? ''
  const workingDays = useMemo(
    () => countWorkingDays(startDate, endDate || startDate),
    [startDate, endDate],
  )

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setIsUploading(true)
    const newUploadedFiles: AttachmentMetadata[] = []

    for (const file of files) {
      try {
        const metadata = await uploadAttachment(file)
        newUploadedFiles.push(metadata)
      } catch {
        message.error(`Failed to upload ${file.name}`)
      }
    }

    if (newUploadedFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...newUploadedFiles])
      message.success(`${newUploadedFiles.length} file(s) uploaded`)
    }

    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const onSubmit = async (values: AbsenceReportValues) => {
    setBanner(null)
    try {
      const attachmentIds = uploadedFiles.map((f) => f.id)
      const payload = {
        type: values.type,
        startDate: values.startDate,
        endDate: values.endDate || values.startDate,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      }
      if (existingAbsence) {
        await updateAbsence(existingAbsence.id, payload)
        message.success('ההיעדרות עודכנה בהצלחה')
      } else {
        await createAbsence(payload)
        message.success('ההיעדרות נשמרה בהצלחה')
      }
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
          <span className="manual-report__field-label">{isMultiDay ? 'מתאריך' : 'תאריך'}</span>
          <input type="date" className="manual-report__field-input" aria-label="מתאריך" {...register('startDate')} />
          {errors.startDate ? <p className="manual-report__field-error">{errors.startDate.message}</p> : null}
        </label>
        {isMultiDay ? (
          <label className="manual-report__field">
            <span className="manual-report__field-label">עד תאריך</span>
            <input type="date" className="manual-report__field-input" aria-label="עד תאריך" {...register('endDate')} />
            {errors.endDate ? <p className="manual-report__field-error">{errors.endDate.message}</p> : null}
          </label>
        ) : existingAbsence ? null : (
          <button
            type="button"
            className="absence-report__more-days-link"
            onClick={() => setIsMultiDay(true)}
          >
            דיווח על היעדרות ליותר מיום אחד
          </button>
        )}
      </div>
      <p className="absence-report__count" data-testid="working-day-count">
        {startDate ? `${workingDays} ימי עבודה` : 'בחרו תאריכים כדי לראות כמה ימי עבודה נספרים'}
      </p>
      <div className="absence-report__documents">
        <label className="manual-report__field">
          <span className="manual-report__field-label">מסמכים (אופציונלי)</span>
          <button
            type="button"
            className="absence-report__upload-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <span className="absence-report__upload-icon">📄</span>
            <span className="absence-report__upload-text">יש לצרף תמונה או מסמך</span>
            <span className="absence-report__upload-formats">JPG / PNG / PDF / documents</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
        {uploadedFiles.length > 0 && (
          <div className="absence-report__uploaded-files">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="absence-report__file-item">
                <span className="absence-report__file-name">{file.filename}</span>
                <button
                  type="button"
                  className="absence-report__file-remove"
                  onClick={() => removeFile(file.id)}
                  aria-label={`Remove ${file.filename}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
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
