import { useEffect, useRef } from 'react'
import type { ReportingOptions, WorkLocation } from '../types'
import { LOCATION_OPTIONS, type PickerStep } from './ManualReport.constants'
import arrowBack from '../assets/manual-report/arrow-back.svg'
import check from '../assets/manual-report/check.svg'

const STEP_TITLE: Record<PickerStep, string> = {
  project: 'בחר פרויקט',
  task: 'בחר משימה',
  location: 'בחר מיקום',
}

const STEP_CTA: Record<PickerStep, string> = {
  project: 'המשך ובחר משימה',
  task: 'המשך ובחר מיקום',
  location: 'המשך',
}

interface PickerGroup {
  label: string
  options: { value: string; label: string }[]
}

interface Props {
  step: PickerStep
  options: ReportingOptions
  clientId: string
  projectId: string
  taskId: string
  workLocation: string
  onSelectProject: (clientId: string, projectId: string) => void
  onSelectTask: (taskId: string) => void
  onSelectLocation: (workLocation: WorkLocation) => void
  onBack: () => void
  onContinue: () => void
}

function groupsFor(step: PickerStep, options: ReportingOptions, clientId: string, projectId: string): PickerGroup[] {
  if (step === 'project') {
    return options.clients.map((client) => ({
      label: client.name,
      options: client.projects.map((project) => ({ value: project.id, label: project.name })),
    }))
  }

  if (step === 'task') {
    const tasks =
      options.clients
        .find((client) => client.id === clientId)
        ?.projects.find((project) => project.id === projectId)?.tasks ?? []
    return [{ label: 'משימות', options: tasks.map((task) => ({ value: task.id, label: task.name })) }]
  }

  return [{ label: 'מיקום', options: LOCATION_OPTIONS }]
}

/**
 * The stepped sheet from Figma 1:7225 / 1:7926 / 1:8238. Each step commits the
 * choice immediately, so backing out of the flow still keeps what was picked.
 */
function ManualReportPicker({
  step,
  options,
  clientId,
  projectId,
  taskId,
  workLocation,
  onSelectProject,
  onSelectTask,
  onSelectLocation,
  onBack,
  onContinue,
}: Props) {
  const selected = step === 'project' ? projectId : step === 'task' ? taskId : workLocation
  const groups = groupsFor(step, options, clientId, projectId)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const choose = (value: string) => {
    if (step === 'project') {
      const owner = options.clients.find((client) =>
        client.projects.some((project) => project.id === value),
      )
      if (owner) onSelectProject(owner.id, value)
      return
    }
    if (step === 'task') {
      onSelectTask(value)
      return
    }
    onSelectLocation(value as WorkLocation)
  }

  return (
    <div className="mr-sheet-overlay" role="dialog" aria-modal="true" aria-label={STEP_TITLE[step]}>
      <div className="mr-sheet">
        <header className="mr-sheet__header">
          <h2 className="mr-sheet__title" tabIndex={-1} ref={headingRef}>
            {STEP_TITLE[step]}
          </h2>
          <button type="button" className="mr-sheet__back" onClick={onBack} aria-label="חזרה">
            <img src={arrowBack} alt="" width={16} height={16} />
          </button>
        </header>

        <div className="mr-sheet__body">
          {groups.map((group) => (
            <section className="mr-sheet__group" key={group.label}>
              <p className="mr-sheet__group-label">{group.label}</p>
              <div className="mr-card">
                {group.options.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className="mr-cell mr-sheet__option"
                    aria-selected={selected === option.value}
                    onClick={() => choose(option.value)}
                  >
                    <span className="mr-cell__label">{option.label}</span>
                    {selected === option.value && <img src={check} alt="" width={16} height={16} />}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mr-sheet__footer">
          <button type="button" className="mr-sheet__cta" disabled={!selected} onClick={onContinue}>
            {STEP_CTA[step]}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default ManualReportPicker
