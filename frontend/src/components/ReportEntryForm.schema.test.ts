import { describe, expect, it } from 'vitest'
import { reportEntryFormSchema } from './ReportEntryForm.schema'

const valid = {
  date: '2026-08-16',
  workLocation: 'OFFICE' as const,
  startTime: '09:00',
  endTime: '18:00',
  clientId: 'client-1',
  projectId: 'project-1',
  taskId: 'task-1',
  description: 'עבודה',
}

describe('reportEntryFormSchema', () => {
  it('rejects a missing description', () => {
    const result = reportEntryFormSchema.safeParse({ ...valid, description: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'description')).toBe(true)
    }
  })

  it('rejects end time before start time', () => {
    const result = reportEntryFormSchema.safeParse({ ...valid, startTime: '18:00', endTime: '09:00' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'endTime')).toBe(true)
    }
  })

  it('accepts valid input', () => {
    expect(reportEntryFormSchema.safeParse(valid).success).toBe(true)
  })
})
