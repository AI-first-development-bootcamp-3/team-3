import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'
import { sessionStore } from '../services/sessionStore'

function mockFetchOnce(response: { ok: boolean; status: number; json: unknown; headers?: Record<string, string> }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    headers: new Headers({ 'content-type': 'application/json', ...response.headers }),
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

    expect(screen.getByLabelText(/אימייל/)).toBeInTheDocument()
    expect(screen.getByLabelText(/סיסמה/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /התחבר/ })).toBeInTheDocument()
  })

  it('renders the Remember me checkbox unchecked by default', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    expect(screen.getByRole('checkbox', { name: /זכור אותי/ })).not.toBeChecked()
  })

  it('shows inline validation errors for an empty submit', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /התחבר/ }))

    expect(await screen.findByText(/יש להזין אימייל/)).toBeInTheDocument()
    expect(await screen.findByText(/יש להזין סיסמה/)).toBeInTheDocument()
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

    await user.type(screen.getByLabelText(/אימייל/), 'admin@abra.test')
    await user.type(screen.getByLabelText(/סיסמה/), 'password123')
    await user.click(screen.getByRole('button', { name: /התחבר/ }))

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

    await user.type(screen.getByLabelText(/אימייל/), 'admin@abra.test')
    await user.type(screen.getByLabelText(/סיסמה/), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /התחבר/ }))

    expect(await screen.findByText(/אימייל או סיסמה שגויים/)).toBeInTheDocument()
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

    await user.type(screen.getByLabelText(/אימייל/), 'admin@abra.test')
    await user.type(screen.getByLabelText(/סיסמה/), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /התחבר/ }))

    expect(await screen.findByText(/יותר מדי ניסיונות/)).toBeInTheDocument()
    expect(screen.queryByText(/אימייל או סיסמה שגויים/)).not.toBeInTheDocument()
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

    await user.type(screen.getByLabelText(/אימייל/), 'admin@abra.test')
    await user.type(screen.getByLabelText(/סיסמה/), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /התחבר/ }))

    expect(await screen.findByText(/יותר מדי ניסיונות/)).toBeInTheDocument()
    expect(screen.getByLabelText(/אימייל/)).toHaveValue('admin@abra.test')
    expect(screen.getByLabelText(/סיסמה/)).toHaveValue('wrong-password')
    expect(screen.getByRole('button', { name: /התחבר/ })).toBeEnabled()
  })

  it('shows a locked message with the remaining time, distinct from the other failure messages', async () => {
    mockFetchOnce({
      ok: false,
      status: 423,
      json: { error: { code: 'LOCKED', message: 'Locked' } },
      headers: { 'retry-after': '125' },
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/אימייל/), 'admin@abra.test')
    await user.type(screen.getByLabelText(/סיסמה/), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /התחבר/ }))

    expect(await screen.findByText(/ננעל זמנית/)).toBeInTheDocument()
    // 125 seconds -> 2:05
    expect(screen.getByText(/2:05/)).toBeInTheDocument()
    expect(screen.queryByText(/אימייל או סיסמה שגויים/)).not.toBeInTheDocument()
    expect(screen.queryByText(/יותר מדי ניסיונות/)).not.toBeInTheDocument()
    expect(sessionStore.getState().token).toBeNull()
  })

  it('counts the locked message down and re-enables the form once it reaches zero', async () => {
    mockFetchOnce({
      ok: false,
      status: 423,
      json: { error: { code: 'LOCKED', message: 'Locked' } },
      headers: { 'retry-after': '2' },
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/אימייל/), 'admin@abra.test')
    await user.type(screen.getByLabelText(/סיסמה/), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /התחבר/ }))

    expect(await screen.findByText(/0:02/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /התחבר/ })).toBeDisabled()

    expect(await screen.findByText(/0:01/, {}, { timeout: 2000 })).toBeInTheDocument()

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /התחבר/ })).toBeEnabled()
        expect(screen.queryByText(/ננעל זמנית/)).not.toBeInTheDocument()
      },
      { timeout: 2000 },
    )
  })

  it('keeps the typed email and password after a 423', async () => {
    mockFetchOnce({
      ok: false,
      status: 423,
      json: { error: { code: 'LOCKED', message: 'Locked' } },
      headers: { 'retry-after': '600' },
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/אימייל/), 'admin@abra.test')
    await user.type(screen.getByLabelText(/סיסמה/), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /התחבר/ }))

    expect(await screen.findByText(/ננעל זמנית/)).toBeInTheDocument()
    expect(screen.getByLabelText(/אימייל/)).toHaveValue('admin@abra.test')
    expect(screen.getByLabelText(/סיסמה/)).toHaveValue('wrong-password')
  })

  it('shows a generic error on an unmapped server error without redirecting or clearing session state', async () => {
    mockFetchOnce({ ok: false, status: 500, json: { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' } } })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/אימייל/), 'admin@abra.test')
    await user.type(screen.getByLabelText(/סיסמה/), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /התחבר/ }))

    expect(await screen.findByText(/משהו השתבש/)).toBeInTheDocument()
    expect(screen.queryByText(/אימייל או סיסמה שגויים/)).not.toBeInTheDocument()
    expect(screen.queryByText(/יותר מדי ניסיונות/)).not.toBeInTheDocument()
    expect(sessionStore.getState().token).toBeNull()
  })

  it('sends rememberMe: false and still stores the session in localStorage when left unchecked', async () => {
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

    await user.type(screen.getByLabelText(/אימייל/), 'admin@abra.test')
    await user.type(screen.getByLabelText(/סיסמה/), 'password123')
    await user.click(screen.getByRole('button', { name: /התחבר/ }))

    await waitFor(() => {
      expect(sessionStore.getState().token).toBe('a-jwt-token')
    })
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(requestInit.body as string)).toMatchObject({ rememberMe: false })
    expect(window.localStorage.getItem('abra.session')).not.toBeNull()
    expect(window.sessionStorage.getItem('abra.session')).toBeNull()
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

    await user.type(screen.getByLabelText(/אימייל/), 'admin@abra.test')
    await user.type(screen.getByLabelText(/סיסמה/), 'password123')
    await user.click(screen.getByRole('checkbox', { name: /זכור אותי/ }))
    await user.click(screen.getByRole('button', { name: /התחבר/ }))

    await waitFor(() => {
      expect(sessionStore.getState().token).toBe('a-jwt-token')
    })
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(requestInit.body as string)).toMatchObject({ rememberMe: true })
    expect(window.localStorage.getItem('abra.session')).not.toBeNull()
    expect(window.sessionStorage.getItem('abra.session')).toBeNull()
  })
})
