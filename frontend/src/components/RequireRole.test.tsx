import { render, screen, cleanup } from '@testing-library/react'
import { describe, expect, it, afterEach } from 'vitest'
import RequireRole from './RequireRole'
import { sessionStore } from '../services/sessionStore'

describe('RequireRole', () => {
  afterEach(() => {
    cleanup()
    sessionStore.getState().clearSession()
  })

  it('renders a forbidden message when no user is signed in', () => {
    render(
      <RequireRole role="admin">
        <div>Admin content</div>
      </RequireRole>,
    )

    expect(screen.getByText(/forbidden - admin role required/i)).toBeInTheDocument()
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
  })

  it('renders a forbidden message when the signed-in user has a different role', () => {
    sessionStore
      .getState()
      .setSession({ id: '1', fullName: 'Regular Employee', email: 'e@abra.test', userType: 'regular', active: true }, 'a-token')

    render(
      <RequireRole role="admin">
        <div>Admin content</div>
      </RequireRole>,
    )

    expect(screen.getByText(/forbidden - admin role required/i)).toBeInTheDocument()
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
  })

  it('renders the children when the signed-in user has the required role', () => {
    sessionStore
      .getState()
      .setSession({ id: '1', fullName: 'Site Admin', email: 'a@abra.test', userType: 'admin', active: true }, 'a-token')

    render(
      <RequireRole role="admin">
        <div>Admin content</div>
      </RequireRole>,
    )

    expect(screen.getByText('Admin content')).toBeInTheDocument()
    expect(screen.queryByText(/forbidden/i)).not.toBeInTheDocument()
  })
})
