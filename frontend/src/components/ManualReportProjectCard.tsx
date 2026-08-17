import type { UseFormRegister } from 'react-hook-form'
import type { ReportingOptions } from '../types'
import type { ManualReportValues, ProjectRowValues } from './ManualReport.schema'
import { LOCATION_OPTIONS, type PickerStep } from './ManualReport.constants'
import trashIcon from '../assets/manual-report/desktop/trash.svg'

export type RowErrors = Partial<Record<keyof ProjectRowValues, string>>

interface Props {
  index: number
  variant?: 'mobile' | 'desktop'
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

function ManualReportProjectCard({
  index,
  variant = 'desktop',
  values,
  options,
  errors,
  register,
  onPick,
  onRemove,
}: Props) {
  const names = nameOf(options, values)

  if (variant === 'desktop') {
    return (
      <article className="mr-project--desktop">
        <div className="mr-project--desktop__head">
          <button type="button" className="mr-project--desktop__delete" onClick={onRemove}>
            <img src={trashIcon} alt="" width={20} height={20} />
            מחיקת פרויקט
          </button>
          <h3 className="mr-project--desktop__title">{`פרויקט מס׳ ${index + 1}`}</h3>
        </div>

        <div className="mr-project--desktop__pickers">
          <div className="mr-project--desktop__pick-col">
            <button type="button" className="mr-project--desktop__pick" onClick={() => onPick('project')}>
              <span className="mr-project--desktop__pick-label">בחרו פרויקט</span>
              <span
                className={`mr-project--desktop__pick-value${names.project ? ' mr-project--desktop__pick-value--filled' : ''}`}
              >
                {names.project ? `${names.client} › ${names.project}` : 'בחרו פרויקט'}
              </span>
            </button>
            {errors.projectId ? <p className="mr-project--desktop__error">{errors.projectId}</p> : null}
          </div>

          <div className="mr-project--desktop__pick-col">
            <button type="button" className="mr-project--desktop__pick" onClick={() => onPick('task')}>
              <span className="mr-project--desktop__pick-label">בחרו משימה</span>
              <span
                className={`mr-project--desktop__pick-value${names.task ? ' mr-project--desktop__pick-value--filled' : ''}`}
              >
                {names.task ?? 'בחרו משימה'}
              </span>
            </button>
            {errors.taskId ? <p className="mr-project--desktop__error">{errors.taskId}</p> : null}
          </div>

          <div className="mr-project--desktop__pick-col">
            <button type="button" className="mr-project--desktop__pick" onClick={() => onPick('location')}>
              <span className="mr-project--desktop__pick-label">בחרו מיקום</span>
              <span
                className={`mr-project--desktop__pick-value${names.location ? ' mr-project--desktop__pick-value--filled' : ''}`}
              >
                {names.location ?? 'בחרו מיקום'}
              </span>
            </button>
            {errors.workLocation ? <p className="mr-project--desktop__error">{errors.workLocation}</p> : null}
          </div>
        </div>

        <div className="mr-project--desktop__times">
          <div className="mr-project--desktop__time-col">
            <label className="manual-report__field">
              <span className="manual-report__field-label">שעת התחלה</span>
              <input
                type="time"
                className="manual-report__field-input"
                aria-label={`שעת התחלה ${index + 1}`}
                {...register(`rows.${index}.startTime`)}
              />
            </label>
            {errors.startTime ? <p className="mr-project--desktop__error">{errors.startTime}</p> : null}
          </div>

          <div className="mr-project--desktop__time-col">
            <label className="manual-report__field">
              <span className="manual-report__field-label">שעת סיום</span>
              <input
                type="time"
                className="manual-report__field-input"
                aria-label={`שעת סיום ${index + 1}`}
                {...register(`rows.${index}.endTime`)}
              />
            </label>
            {errors.endTime ? <p className="mr-project--desktop__error">{errors.endTime}</p> : null}
          </div>
        </div>

        <label className="mr-project--desktop__detail-wrap">
          <span className="mr-project--desktop__detail-label">פירוט הדיווח</span>
          <textarea
            className="mr-project--desktop__detail"
            placeholder="הוספת פירוט..."
            aria-label={`פירוט ${index + 1}`}
            {...register(`rows.${index}.description`)}
          />
        </label>
        {errors.description ? <p className="mr-project--desktop__error">{errors.description}</p> : null}
      </article>
    )
  }

  return null
}

export default ManualReportProjectCard
