import type { UseFormRegister } from 'react-hook-form'
import type { ReportingOptions, WorkLocation } from '../types'
import {
  derivedRowHours,
  rowFormat,
  type ManualReportValues,
  type ProjectRowValues,
} from './ManualReport.schema'
import { LOCATION_OPTIONS } from './ManualReport.constants'
import ManualReportSelect from './ManualReportSelect'
import trashIcon from '../assets/manual-report/desktop/trash.svg'

export type RowErrors = Partial<Record<keyof ProjectRowValues, string>>

interface Props {
  index: number
  variant?: 'mobile' | 'desktop'
  values: ProjectRowValues
  /** The day's כניסה, the axis a row's clock pair is measured against. */
  dayStart: string
  options: ReportingOptions
  errors: RowErrors
  register: UseFormRegister<ManualReportValues>
  onProjectChange: (clientId: string, projectId: string) => void
  onTaskChange: (taskId: string) => void
  onLocationChange: (workLocation: WorkLocation | '') => void
  onHoursChange: () => void
  onRemove: () => void
}

function tasksFor(options: ReportingOptions, values: ProjectRowValues) {
  return (
    options.clients
      .find((client) => client.id === values.clientId)
      ?.projects.find((project) => project.id === values.projectId)?.tasks ?? []
  )
}

function hoursLabel(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} שעות`
}

function ManualReportProjectCard({
  index,
  variant = 'desktop',
  values,
  dayStart,
  options,
  errors,
  register,
  onProjectChange,
  onTaskChange,
  onLocationChange,
  onHoursChange,
  onRemove,
}: Props) {
  const tasks = tasksFor(options, values)
  const projectKey = values.clientId && values.projectId ? `${values.clientId}:${values.projectId}` : ''
  const hoursFilled = Number(values.hours) > 0
  const clockInOut = rowFormat(values, options) === 'CLOCK_IN_OUT'
  const derivedHours = derivedRowHours(dayStart, values.rowStartTime ?? '', values.rowEndTime ?? '')

  if (variant !== 'desktop') {
    return null
  }

  return (
    <article className="mr-project--desktop">
      <div className="mr-project--desktop__head">
        <button type="button" className="mr-project--desktop__delete" onClick={onRemove}>
          מחיקת פרויקט
          <img src={trashIcon} alt="" width={20} height={20} />
        </button>
        <h3 className="mr-project--desktop__title">{`פרויקט מס׳ ${index + 1}`}</h3>
      </div>

      <div className="mr-project--desktop__pickers">
        <div className="mr-project--desktop__pick-col">
          <span className="mr-project--desktop__pick-label">פרויקט</span>
          <ManualReportSelect
            ariaLabel={`פרויקט ${index + 1}`}
            value={projectKey}
            options={options.clients.flatMap((client) =>
              client.projects.map((project) => ({
                value: `${client.id}:${project.id}`,
                label: project.name,
              })),
            )}
            onChange={(next) => {
              const [clientId, projectId] = next.split(':')
              onProjectChange(clientId ?? '', projectId ?? '')
            }}
          />
          {errors.projectId ? <p className="mr-project--desktop__error">{errors.projectId}</p> : null}
        </div>

        <div className="mr-project--desktop__pick-col">
          <span className="mr-project--desktop__pick-label">משימה</span>
          <ManualReportSelect
            ariaLabel={`משימה ${index + 1}`}
            value={values.taskId}
            disabled={!values.projectId}
            options={tasks.map((task) => ({ value: task.id, label: task.name }))}
            onChange={onTaskChange}
          />
          {errors.taskId ? <p className="mr-project--desktop__error">{errors.taskId}</p> : null}
        </div>

        <div className="mr-project--desktop__pick-col">
          <span className="mr-project--desktop__pick-label">מיקום</span>
          <ManualReportSelect
            ariaLabel={`מיקום ${index + 1}`}
            value={values.workLocation}
            options={LOCATION_OPTIONS.map((location) => ({ value: location.value, label: location.label }))}
            onChange={(next) => onLocationChange(next as WorkLocation | '')}
          />
          {errors.workLocation ? <p className="mr-project--desktop__error">{errors.workLocation}</p> : null}
        </div>

        {clockInOut ? (
          <>
            <label className="mr-project--desktop__time-col">
              <span className="mr-project--desktop__pick-label">כניסה</span>
              <input
                type="time"
                className={`mr-project--desktop__hours${values.rowStartTime ? ' mr-project--desktop__hours--filled' : ''}`}
                aria-label={`כניסה ${index + 1}`}
                {...register(`rows.${index}.rowStartTime`, {
                  onChange: () => onHoursChange(),
                })}
              />
              {errors.rowStartTime ? <p className="mr-project--desktop__error">{errors.rowStartTime}</p> : null}
            </label>

            <label className="mr-project--desktop__time-col">
              <span className="mr-project--desktop__pick-label">יציאה</span>
              <input
                type="time"
                className={`mr-project--desktop__hours${values.rowEndTime ? ' mr-project--desktop__hours--filled' : ''}`}
                aria-label={`יציאה ${index + 1}`}
                {...register(`rows.${index}.rowEndTime`, {
                  onChange: () => onHoursChange(),
                })}
              />
              {errors.rowEndTime ? <p className="mr-project--desktop__error">{errors.rowEndTime}</p> : null}
            </label>

            <div className="mr-project--desktop__time-col">
              <span className="mr-project--desktop__pick-label">שעות</span>
              <output
                className="mr-project--desktop__hours mr-project--desktop__hours--readonly"
                aria-label={`שעות ${index + 1}`}
                aria-live="polite"
              >
                {hoursLabel(derivedHours)}
              </output>
            </div>
          </>
        ) : (
          <label className="mr-project--desktop__pick-col">
            <span className="mr-project--desktop__pick-label">שעות</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              dir="rtl"
              placeholder="0"
              className={`mr-project--desktop__hours${hoursFilled ? ' mr-project--desktop__hours--filled' : ''}`}
              aria-label={`שעות ${index + 1}`}
              {...register(`rows.${index}.hours`, {
                onChange: () => onHoursChange(),
              })}
            />
            {errors.hours ? <p className="mr-project--desktop__error">{errors.hours}</p> : null}
          </label>
        )}
      </div>

      <label className="mr-project--desktop__detail-wrap">
        <span className="mr-project--desktop__detail-label">פירוט הדיווח</span>
        <textarea
          className="mr-project--desktop__detail"
          placeholder="הוספת פירוט..."
          rows={1}
          aria-label={`פירוט ${index + 1}`}
          {...register(`rows.${index}.description`)}
        />
      </label>
      {errors.description ? <p className="mr-project--desktop__error">{errors.description}</p> : null}
    </article>
  )
}

export default ManualReportProjectCard
