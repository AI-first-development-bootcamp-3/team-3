import { render, screen, cleanup } from '@testing-library/react'
import { describe, expect, it, afterEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RequireGuest from './RequireGuest'
import { sessionStore } from '../services/sessionStore'

function renderWithRoutes(initialEntries: Array<string | { pathname: string; state?: unknown }>) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/login"
          element={
            <RequireGuest>
              <div>Login form</div>
            </RequireGuest>
          }
        />
        <Route path="/" element={<div>Home page</div>} />
        <Route path="/admin/assignments" element={<div>Admin page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireGuest', () => {
  afterEach(() => {
    cleanup()
    sessionStore.getState().clearSession()
  })

  it('sends an employee to hours home when they hit /login while signed in', () => {
    sessionStore
      .getState()
      .setSession(
        { id: '1', fullName: 'Regular Employee', email: 'e@abra.test', userType: 'regular', active: true },
        'a-token',
        new Date(Date.now() + 60_000).toISOString(),
        false,
      )

    renderWithRoutes(['/login'])

    expect(screen.getByText('Home page')).toBeInTheDocument()
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
  })

  it('sends an admin to /admin when they hit /login while signed in', () => {
    sessionStore
      .getState()
      .setSession(
        { id: '1', fullName: 'Admin', email: 'a@abra.test', userType: 'admin', active: true },
        'a-token',
        new Date(Date.now() + 60_000).toISOString(),
        false,
      )

    renderWithRoutes(['/login'])

    expect(screen.getByText('Admin page')).toBeInTheDocument()
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
  })

  it('does not send an employee to /admin even if location.state.from points there', () => {
    sessionStore
      .getState()
      .setSession(
        { id: '1', fullName: 'Regular Employee', email: 'e@abra.test', userType: 'regular', active: true },
        'a-token',
        new Date(Date.now() + 60_000).toISOString(),
        false,
      )

    renderWithRoutes([{ pathname: '/login', state: { from: { pathname: '/admin' } } }])

    expect(screen.getByText('Home page')).toBeInTheDocument()
    expect(screen.queryByText('Admin page')).not.toBeInTheDocument()
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
  })

  it('renders the children normally when there is no active session', () => {
    renderWithRoutes(['/login'])

    expect(screen.getByText('Login form')).toBeInTheDocument()
  })
})
