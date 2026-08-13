import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'
import { sessionStore } from '../services/sessionStore'

describe('Login component', () => {
  afterEach(() => {
    cleanup()
    sessionStore.getState().clearSession()
  })

  it('renders sign in buttons', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: /sign in as employee/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in as admin/i })).toBeInTheDocument()
  })

  it('sets the regular user session when employee button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const btn = screen.getByRole('button', { name: /sign in as employee/i })
    await user.click(btn)

    const state = sessionStore.getState()
    expect(state.user?.userType).toBe('regular')
    expect(state.token).toBeTruthy()
  })

  it('sets the admin user session when admin button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const btn = screen.getByRole('button', { name: /sign in as admin/i })
    await user.click(btn)

    const state = sessionStore.getState()
    expect(state.user?.userType).toBe('admin')
    expect(state.token).toBeTruthy()
  })
})
