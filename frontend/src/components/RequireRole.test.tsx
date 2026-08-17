import { render, screen, cleanup } from '@testing-library/react'
import { describe, expect, it, afterEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RequireRole from './RequireRole'
import { sessionStore } from '../services/sessionStore'

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <div>Admin content</div>
            </RequireRole>
          }
        />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireRole', () => {
  afterEach(() => {
    cleanup()
    sessionStore.getState().clearSession()
  })

  it('redirects to / and does not render the children when no user is signed in', () => {
    renderWithRoutes()

    expect(screen.getByText('Home page')).toBeInTheDocument()
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
  })

  it('redirects to / and does not render the children when the signed-in user has a different role', () => {
    sessionStore
      .getState()
      .setSession(
        { id: '1', fullName: 'Regular Employee', email: 'e@abra.test', userType: 'regular', active: true },
        'a-token',
        new Date(Date.now() + 60_000).toISOString(),
        false,
      )

    renderWithRoutes()

    expect(screen.getByText('Home page')).toBeInTheDocument()
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
  })

  it('renders the children when the signed-in user has the required role', () => {
    sessionStore
      .getState()
      .setSession(
        { id: '1', fullName: 'Site Admin', email: 'a@abra.test', userType: 'admin', active: true },
        'a-token',
        new Date(Date.now() + 60_000).toISOString(),
        false,
      )

    renderWithRoutes()

    expect(screen.getByText('Admin content')).toBeInTheDocument()
    expect(screen.queryByText('Home page')).not.toBeInTheDocument()
  })
})
