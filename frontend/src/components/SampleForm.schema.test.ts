import { describe, expect, it } from 'vitest'
import { sampleFormSchema } from './SampleForm.schema'

describe('sampleFormSchema', () => {
  it('rejects a missing required field', () => {
    const result = sampleFormSchema.safeParse({
      name: '',
      startTime: '09:00',
      endTime: '17:00',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'name')).toBe(
        true,
      )
    }
  })

  it('rejects end time before start time', () => {
    const result = sampleFormSchema.safeParse({
      name: 'Dan',
      startTime: '17:00',
      endTime: '09:00',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'endTime')).toBe(
        true,
      )
    }
  })

  it('accepts valid input', () => {
    const result = sampleFormSchema.safeParse({
      name: 'Dan',
      startTime: '09:00',
      endTime: '17:00',
    })

    expect(result.success).toBe(true)
  })
})
