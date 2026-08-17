import type { UseFormRegister } from 'react-hook-form'
import type { ReportingOptions } from '../types'
import type { ManualReportValues, ProjectRowValues } from './ManualReport.schema'
import { ChipArrow, DisclosureChevron, SelectChevrons } from './ManualReportIcons'
import { LOCATION_OPTIONS, type PickerStep } from './ManualReport.constants'

export type RowErrors = Partial<Record<keyof ProjectRowValues, string>>

interface Props {
  index: number
  values: ProjectRowValues
  options: ReportingOptions
  errors: RowErrors
  register: UseFormRegister<ManualReportValues>
  onPick: (step: PickerStep) => void
  onRemove: () => void
}

function nameOf(options: ReportingOptions, values: ProjectRowValues) {
  const client = options.clients.find((item) => item.id === values.clientId)
  const project = client?.projects.find((item) => item.id === values.projectId)
  const task = project?.tasks.find((item) => item.id === values.taskId)
  const location = LOCATION_OPTIONS.find((item) => item.value === values.workLocation)
  return { client: client?.name, project: project?.name, task: task?.name, location: location?.label }
}

function ManualReportProjectCard({ index, values, options, errors, register, onPick, onRemove }: Props) {
  const names = nameOf(options, values)

  return (
    <div className="mr-card">
      <button
        type="button"
        className="mr-cell"
        onClick={() => onPick('project')}
        aria-label={`פרויקט ${index + 1}`}
      >
        <span className="mr-cell__label">
          פרויקט
          {errors.projectId && <span className="mr-cell__required"> *</span>}
        </span>
        <span className="mr-cell__value">
          {names.project ? (
            <>
              <span className="mr-chip">{names.client}</span>
              <ChipArrow />
              <span className="mr-chip mr-chip--value">{names.project}</span>
            </>
          ) : (
            <span className="mr-cell__placeholder">בחירה</span>
          )}
        </span>
        <DisclosureChevron />
      </button>

      <button
        type="button"
        className="mr-cell"
        onClick={() => onPick('task')}
        aria-label={`משימה ${index + 1}`}
      >
        <span className="mr-cell__label">
          משימה
          {errors.taskId && <span className="mr-cell__required"> *</span>}
        </span>
        <span className="mr-cell__value">
          {names.task ? (
            <span className="mr-chip mr-chip--value">{names.task}</span>
          ) : (
            <span className="mr-cell__placeholder">בחירה</span>
          )}
        </span>
        <DisclosureChevron />
      </button>

      <button
        type="button"
        className="mr-cell"
        onClick={() => onPick('location')}
        aria-label={`מיקום ${index + 1}`}
      >
        <span className="mr-cell__label">
          מיקום
          {errors.workLocation && <span className="mr-cell__required"> *</span>}
        </span>
        <span className="mr-cell__value">
          {names.location ? (
            <span className="mr-chip mr-chip--value">{names.location}</span>
          ) : (
            <span className="mr-cell__placeholder">בחירה</span>
          )}
        </span>
        <SelectChevrons />
      </button>

      <label className="mr-cell">
        <span className="mr-cell__label">שעת התחלה</span>
        <span className="mr-cell__value">
          <input
            type="time"
            className="mr-cell__time"
            aria-label={`שעת התחלה ${index + 1}`}
            {...register(`rows.${index}.startTime`)}
          />
        </span>
      </label>
      {errors.startTime && <p className="mr-cell__error">{errors.startTime}</p>}

      <label className="mr-cell">
        <span className="mr-cell__label">שעת סיום</span>
        <span className="mr-cell__value">
          <input
            type="time"
            className="mr-cell__time"
            aria-label={`שעת סיום ${index + 1}`}
            {...register(`rows.${index}.endTime`)}
          />
        </span>
      </label>
      {errors.endTime && <p className="mr-cell__error">{errors.endTime}</p>}

      <label className="mr-cell">
        <input
          type="text"
          className="mr-cell__detail"
          placeholder="הוספת פירוט..."
          aria-label={`פירוט ${index + 1}`}
          {...register(`rows.${index}.description`)}
        />
      </label>

      <button type="button" className="mr-project__footer" onClick={onRemove}>
        מחיקת פרויקט
      </button>
    </div>
  )
}

export default ManualReportProjectCard
