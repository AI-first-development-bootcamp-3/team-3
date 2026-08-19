import { describe, expect, it } from 'vitest'
import { AUDIT_CHANGE_LABELS, auditChangeLabels } from './auditChangeLabels'

function row(overrides: Record<string, unknown> = {}) {
  return {
    clientId: 'c1',
    projectId: 'p1',
    taskId: 't1',
    workLocation: 'OFFICE',
    hours: 9,
    description: 'Design',
    startTime: '09:00',
    endTime: '18:00',
    rowStartTime: null,
    rowEndTime: null,
    ...overrides,
  }
}

describe('auditChangeLabels', () => {
  it('labels a deleted day as מחיקת דיווח', () => {
    expect(
      auditChangeLabels({
        action: 'DELETED',
        previousJson: [row()],
        nextJson: null,
      }),
    ).toEqual([AUDIT_CHANGE_LABELS.deleted])
  })

  it('labels a brand-new day as יצירת דיווח', () => {
    expect(
      auditChangeLabels({
        action: 'REPLACED',
        previousJson: [],
        nextJson: [row(), row({ projectId: 'p2', taskId: 't2' })],
      }),
    ).toEqual([AUDIT_CHANGE_LABELS.created])
  })

  it('detects field-level edits on a matched project', () => {
    expect(
      auditChangeLabels({
        action: 'REPLACED',
        previousJson: [row()],
        nextJson: [
          row({
            taskId: 't2',
            workLocation: 'HOME',
            hours: 8,
            description: 'Fixed',
          }),
        ],
      }),
    ).toEqual([
      AUDIT_CHANGE_LABELS.task,
      AUDIT_CHANGE_LABELS.location,
      AUDIT_CHANGE_LABELS.hours,
      AUDIT_CHANGE_LABELS.description,
    ])
  })

  it('treats a project swap as שינוי פרויקט rather than add+remove', () => {
    expect(
      auditChangeLabels({
        action: 'REPLACED',
        previousJson: [row()],
        nextJson: [row({ projectId: 'p2', clientId: 'c2', taskId: 't9' })],
      }),
    ).toEqual([AUDIT_CHANGE_LABELS.project, AUDIT_CHANGE_LABELS.task])
  })

  it('labels an extra next row as הוספת פרויקט', () => {
    expect(
      auditChangeLabels({
        action: 'REPLACED',
        previousJson: [row()],
        nextJson: [row(), row({ projectId: 'p2', taskId: 't2', hours: 2 })],
      }),
    ).toEqual([AUDIT_CHANGE_LABELS.addProject])
  })

  it('labels a missing next row as הסרת פרויקט', () => {
    expect(
      auditChangeLabels({
        action: 'REPLACED',
        previousJson: [row(), row({ projectId: 'p2', taskId: 't2' })],
        nextJson: [row()],
      }),
    ).toEqual([AUDIT_CHANGE_LABELS.removeProject])
  })

  it('treats attendance-window edits as שינוי שעות', () => {
    expect(
      auditChangeLabels({
        action: 'REPLACED',
        previousJson: [row()],
        nextJson: [row({ startTime: '08:00', endTime: '17:00' })],
      }),
    ).toEqual([AUDIT_CHANGE_LABELS.hours])
  })
})
