import { describe, expect, it } from 'vitest'
import { ADMIN_HOME_PATH, homePath, postLoginPath } from './authPaths'
import type { User } from '../types'

const employee: User = { id: '1', fullName: 'Emp', email: 'e@x.com', userType: 'regular', active: true }
const admin: User = { id: '2', fullName: 'Adm', email: 'a@x.com', userType: 'admin', active: true }

describe('authPaths', () => {
  it('sends employees home to hours and admins to clients/projects', () => {
    expect(homePath(employee)).toBe('/')
    expect(homePath(admin)).toBe(ADMIN_HOME_PATH)
    expect(ADMIN_HOME_PATH).toBe('/admin/assignments')
  })

  it('sends an admin to clients/projects even if they came from hours', () => {
    expect(postLoginPath(admin, '/')).toBe(ADMIN_HOME_PATH)
    expect(postLoginPath(admin, '/admin/clients')).toBe(ADMIN_HOME_PATH)
  })

  it('sends an employee away from /admin even if that was the from path', () => {
    expect(postLoginPath(employee, '/admin')).toBe('/')
  })
})
