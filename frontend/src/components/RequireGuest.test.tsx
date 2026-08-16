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
        <Route path="/change-password" element={<div>Change password page</div>} />
        <Route path="/absences" element={<div>Absences page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireGuest', () => {
  afterEach(() => {
    cleanup()
    sessionStore.getState().clearSession()
  })

  it('redirects away and does not render the children when a session is active', () => {
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

  it('sends a user with mustChangePassword: true to /change-password instead of /', () => {
    sessionStore
      .getState()
      .setSession(
        {
          id: '1',
          fullName: 'Regular Employee',
          email: 'e@abra.test',
          userType: 'regular',
          active: true,
          mustChangePassword: true,
        },
        'a-token',
        new Date(Date.now() + 60_000).toISOString(),
        false,
      )

    renderWithRoutes(['/login'])

    expect(screen.getByText('Change password page')).toBeInTheDocument()
    expect(screen.queryByText('Home page')).not.toBeInTheDocument()
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
  })

  it('sends the user back to location.state.from.pathname instead of / when redirecting', () => {
    sessionStore
      .getState()
      .setSession(
        { id: '1', fullName: 'Regular Employee', email: 'e@abra.test', userType: 'regular', active: true },
        'a-token',
        new Date(Date.now() + 60_000).toISOString(),
        false,
      )

    renderWithRoutes([{ pathname: '/login', state: { from: { pathname: '/absences' } } }])

    expect(screen.getByText('Absences page')).toBeInTheDocument()
    expect(screen.queryByText('Home page')).not.toBeInTheDocument()
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
  })

  it('renders the children normally when there is no active session', () => {
    renderWithRoutes(['/login'])

    expect(screen.getByText('Login form')).toBeInTheDocument()
  })
})
