import { describe, expect, it } from 'vitest'
import { homePath, postLoginPath } from './authPaths'
import type { User } from '../types'

const employee: User = { id: '1', fullName: 'Emp', email: 'e@x.com', userType: 'regular', active: true }
const admin: User = { id: '2', fullName: 'Adm', email: 'a@x.com', userType: 'admin', active: true }

describe('authPaths', () => {
  it('sends employees home to hours and admins to /admin', () => {
    expect(homePath(employee)).toBe('/')
    expect(homePath(admin)).toBe('/admin')
  })

  it('sends an admin to /admin even if they came from hours', () => {
    expect(postLoginPath(admin, '/')).toBe('/admin')
    expect(postLoginPath(admin, '/admin/clients')).toBe('/admin')
  })

  it('sends an employee away from /admin even if that was the from path', () => {
    expect(postLoginPath(employee, '/admin')).toBe('/')
  })
})
