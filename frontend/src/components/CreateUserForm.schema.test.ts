import { describe, expect, it } from 'vitest'
import { createUserFormSchema } from './CreateUserForm.schema'

const valid = {
  displayName: 'Jane Doe',
  email: 'jane@example.test',
  role: 'EMPLOYEE' as const,
  temporaryPassword: '',
}

describe('createUserFormSchema', () => {
  it('accepts valid input with no temporary password (auto-generated)', () => {
    expect(createUserFormSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts valid input with a temporary password of at least 8 characters', () => {
    const result = createUserFormSchema.safeParse({ ...valid, temporaryPassword: 'a-real-password' })
    expect(result.success).toBe(true)
  })

  it('rejects a missing display name', () => {
    const result = createUserFormSchema.safeParse({ ...valid, displayName: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'displayName')).toBe(true)
    }
  })

  it('rejects a malformed email', () => {
    const result = createUserFormSchema.safeParse({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'email')).toBe(true)
    }
  })

  it('rejects an unrecognized role', () => {
    const result = createUserFormSchema.safeParse({ ...valid, role: 'SUPERUSER' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'role')).toBe(true)
    }
  })

  it('rejects a temporary password shorter than 8 characters when one is supplied', () => {
    const result = createUserFormSchema.safeParse({ ...valid, temporaryPassword: 'short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'temporaryPassword')).toBe(true)
    }
  })
})
