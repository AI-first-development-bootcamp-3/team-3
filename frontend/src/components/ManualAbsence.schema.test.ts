import { describe, expect, it } from 'vitest'
import { manualAbsenceSchema } from './ManualAbsence.schema'

function aSingleDay(overrides: Record<string, unknown> = {}) {
  return {
    type: 'VACATION',
    halfDay: false,
    isRange: false,
    startDate: '2026-08-18',
    endDate: undefined,
    ...overrides,
  }
}

function fieldsOf(result: ReturnType<typeof manualAbsenceSchema.safeParse>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('manualAbsenceSchema', () => {
  it.each(['VACATION', 'SICK', 'RESERVE_DUTY', 'OTHER'])('accepts type %s', (type) => {
    expect(manualAbsenceSchema.safeParse(aSingleDay({ type })).success).toBe(true)
  })

  it('rejects an empty type (nothing chosen yet)', () => {
    const result = manualAbsenceSchema.safeParse(aSingleDay({ type: '' }))

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toContain('type')
  })

  it('rejects a type outside the fixed list', () => {
    const result = manualAbsenceSchema.safeParse(aSingleDay({ type: 'PARENTAL_LEAVE' }))

    expect(result.success).toBe(false)
  })

  it('accepts a single date with no endDate', () => {
    expect(manualAbsenceSchema.safeParse(aSingleDay()).success).toBe(true)
  })

  it('rejects range mode with no endDate chosen', () => {
    const result = manualAbsenceSchema.safeParse(aSingleDay({ isRange: true, endDate: undefined }))

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toContain('endDate')
  })

  it('accepts range mode with a valid endDate on or after startDate', () => {
    const result = manualAbsenceSchema.safeParse(
      aSingleDay({ isRange: true, startDate: '2026-08-18', endDate: '2026-08-20' }),
    )

    expect(result.success).toBe(true)
  })

  it('accepts a range whose endDate equals startDate', () => {
    const result = manualAbsenceSchema.safeParse(
      aSingleDay({ isRange: true, startDate: '2026-08-18', endDate: '2026-08-18' }),
    )

    expect(result.success).toBe(true)
  })

  it('rejects an endDate before startDate', () => {
    const result = manualAbsenceSchema.safeParse(
      aSingleDay({ isRange: true, startDate: '2026-08-20', endDate: '2026-08-18' }),
    )

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toContain('endDate')
  })

  it('rejects a malformed startDate', () => {
    const result = manualAbsenceSchema.safeParse(aSingleDay({ startDate: '18/08/2026' }))

    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toContain('startDate')
  })
})
