import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'
import { sessionStore } from '../services/sessionStore'

function mockFetchOnce(response: { ok: boolean; status: number; json: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => response.json,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('Login page', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    sessionStore.getState().clearSession()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('renders email, password fields and a submit button', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders the Remember me checkbox unchecked by default', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    expect(screen.getByRole('checkbox', { name: /remember me/i })).not.toBeChecked()
  })

  it('shows inline validation errors for an empty submit', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
  })

  it('sets the session and does not redirect to change-password when login succeeds and mustChangePassword is false', async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: {
        token: 'a-jwt-token',
        user: { id: '1', email: 'admin@abra.test', displayName: 'Admin', role: 'ADMIN', mustChangePassword: false },
      },
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/email/i), 'admin@abra.test')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(sessionStore.getState().token).toBe('a-jwt-token')
    })
    expect(sessionStore.getState().user).toMatchObject({ userType: 'admin', mustChangePassword: false })
  })

  it('shows an inline error on invalid credentials without redirecting or clearing session state', async () => {
    mockFetchOnce({ ok: false, status: 401, json: { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } } })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/email/i), 'admin@abra.test')
    await user.type(screen.getByLabelText(/password/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/incorrect email or password/i)).toBeInTheDocument()
    expect(sessionStore.getState().token).toBeNull()
  })

  it('shows a throttled message on 429 without redirecting or clearing session state', async () => {
    mockFetchOnce({ ok: false, status: 429, json: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts' } } })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/email/i), 'admin@abra.test')
    await user.type(screen.getByLabelText(/password/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument()
    expect(screen.queryByText(/incorrect email or password/i)).not.toBeInTheDocument()
    expect(sessionStore.getState().token).toBeNull()
  })

  it('keeps the typed email and password, and a submittable form, after a 429', async () => {
    mockFetchOnce({ ok: false, status: 429, json: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts' } } })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/email/i), 'admin@abra.test')
    await user.type(screen.getByLabelText(/password/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toHaveValue('admin@abra.test')
    expect(screen.getByLabelText(/password/i)).toHaveValue('wrong-password')
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled()
  })

  it('sends rememberMe: false and stores the session in sessionStorage when left unchecked', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: {
        token: 'a-jwt-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        user: { id: '1', email: 'admin@abra.test', displayName: 'Admin', role: 'ADMIN', mustChangePassword: false },
      },
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/email/i), 'admin@abra.test')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(sessionStore.getState().token).toBe('a-jwt-token')
    })
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(requestInit.body as string)).toMatchObject({ rememberMe: false })
    expect(window.sessionStorage.getItem('abra.session')).not.toBeNull()
    expect(window.localStorage.getItem('abra.session')).toBeNull()
  })

  it('sends rememberMe: true and stores the session in localStorage when checked', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: {
        token: 'a-jwt-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        user: { id: '1', email: 'admin@abra.test', displayName: 'Admin', role: 'ADMIN', mustChangePassword: false },
      },
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/email/i), 'admin@abra.test')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('checkbox', { name: /remember me/i }))
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(sessionStore.getState().token).toBe('a-jwt-token')
    })
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(requestInit.body as string)).toMatchObject({ rememberMe: true })
    expect(window.localStorage.getItem('abra.session')).not.toBeNull()
    expect(window.sessionStorage.getItem('abra.session')).toBeNull()
  })
})
