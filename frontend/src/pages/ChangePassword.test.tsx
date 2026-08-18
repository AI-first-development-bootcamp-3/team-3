import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ChangePassword from './ChangePassword'
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

describe('ChangePassword page', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    sessionStore.getState().clearSession()
  })

  it('rejects mismatched passwords before calling the API', async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, json: {} })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('סיסמה חדשה'), 'a-new-password')
    await user.type(screen.getByLabelText('אימות סיסמה'), 'does-not-match')
    await user.click(screen.getByRole('button', { name: 'שמירת סיסמה' }))

    expect(await screen.findByText('הסיסמאות אינן תואמות')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('updates the stored session with mustChangePassword: false on success', async () => {
    sessionStore.getState().setSession(
      { id: '1', fullName: 'New Hire', email: 'new@abra.test', userType: 'regular', active: true, mustChangePassword: true },
      'cookie',
      new Date(Date.now() + 60_000).toISOString(),
      false,
    )
    mockFetchOnce({
      ok: true,
      status: 200,
      json: { id: '1', email: 'new@abra.test', displayName: 'New Hire', role: 'EMPLOYEE', mustChangePassword: false },
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('סיסמה חדשה'), 'a-brand-new-password')
    await user.type(screen.getByLabelText('אימות סיסמה'), 'a-brand-new-password')
    await user.click(screen.getByRole('button', { name: 'שמירת סיסמה' }))

    await waitFor(() => {
      expect(sessionStore.getState().user?.mustChangePassword).toBe(false)
    })
  })
})
