import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { notification } from 'antd'
import CreateUserForm from './CreateUserForm'

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

describe('CreateUserForm', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders name, email, role, and temporary password fields', () => {
    render(<CreateUserForm />)

    expect(screen.getByLabelText('שם מלא')).toBeInTheDocument()
    expect(screen.getByLabelText('אימייל')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByLabelText('סיסמה זמנית')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'יצירת משתמש' })).toBeInTheDocument()
  })

  it('shows inline validation errors for an empty submit', async () => {
    const user = userEvent.setup()
    render(<CreateUserForm />)

    await user.click(screen.getByRole('button', { name: 'יצירת משתמש' }))

    expect(await screen.findByText('יש למלא שם')).toBeInTheDocument()
    expect(await screen.findByText('יש למלא אימייל')).toBeInTheDocument()
  })

  it('creates a user, shows a success notification, and resets the form', async () => {
    mockFetchOnce({
      ok: true,
      status: 201,
      json: {
        user: { id: '1', email: 'new@abra.test', displayName: 'New Person', role: 'EMPLOYEE', isActive: true, mustChangePassword: true },
        temporaryPassword: 'generated-temp-pw',
      },
    })
    const notifySpy = vi.spyOn(notification, 'success').mockImplementation(() => '' as unknown as void)
    const user = userEvent.setup()

    render(<CreateUserForm />)

    await user.type(screen.getByLabelText('שם מלא'), 'New Person')
    await user.type(screen.getByLabelText('אימייל'), 'new@abra.test')
    await user.click(screen.getByRole('button', { name: 'יצירת משתמש' }))

    await waitFor(() => {
      expect(notifySpy).toHaveBeenCalledOnce()
    })
    expect(notifySpy.mock.calls[0]?.[0]).toMatchObject({
      message: 'המשתמש נוצר',
    })
    await waitFor(() => {
      expect(screen.getByLabelText('שם מלא')).toHaveValue('')
    })

    notifySpy.mockRestore()
  })

  it('shows an inline error on the email field for a duplicate-email (409) response', async () => {
    mockFetchOnce({
      ok: false,
      status: 409,
      json: { error: { code: 'CONFLICT', message: 'A user with this email already exists' } },
    })
    const user = userEvent.setup()

    render(<CreateUserForm />)

    await user.type(screen.getByLabelText('שם מלא'), 'Existing Person')
    await user.type(screen.getByLabelText('אימייל'), 'taken@abra.test')
    await user.click(screen.getByRole('button', { name: 'יצירת משתמש' }))

    expect(await screen.findByText('כבר קיים משתמש עם האימייל הזה')).toBeInTheDocument()
  })

  it('shows a form-level error for a malformed-input (400) response', async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      json: { error: { code: 'BAD_REQUEST', message: 'Validation failed', details: [{ field: 'email', message: 'Invalid email' }] } },
    })
    const user = userEvent.setup()

    render(<CreateUserForm />)

    await user.type(screen.getByLabelText('שם מלא'), 'Someone')
    await user.type(screen.getByLabelText('אימייל'), 'someone@abra.test')
    await user.click(screen.getByRole('button', { name: 'יצירת משתמש' }))

    expect(await screen.findByText('חלק מהשדות אינם תקינים. בדקו את הטופס ונסו שוב.')).toBeInTheDocument()
  })

  it('shows a generic form error for an unexpected failure without a global toast taking over', async () => {
    mockFetchOnce({ ok: false, status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'boom' } } })
    const user = userEvent.setup()

    render(<CreateUserForm />)

    await user.type(screen.getByLabelText('שם מלא'), 'Someone')
    await user.type(screen.getByLabelText('אימייל'), 'someone@abra.test')
    await user.click(screen.getByRole('button', { name: 'יצירת משתמש' }))

    expect(await screen.findByText('לא הצלחנו ליצור את המשתמש. נסו שוב.')).toBeInTheDocument()
  })
})
