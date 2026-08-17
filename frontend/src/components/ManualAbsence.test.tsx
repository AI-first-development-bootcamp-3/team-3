import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App, ConfigProvider } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ManualAbsence from './ManualAbsence'
import { sessionStore } from '../services/sessionStore'

function mockFetch(handler: (url: string, init?: RequestInit) => { ok: boolean; status: number; json: unknown }) {
  const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    const response = handler(String(url), init)
    return {
      ok: response.ok,
      status: response.status,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => response.json,
    }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderScreen(onClose = vi.fn(), onSwitchToWork?: () => void) {
  return render(
    <ConfigProvider>
      <App>
        <ManualAbsence onClose={onClose} onSwitchToWork={onSwitchToWork} />
      </App>
    </ConfigProvider>,
  )
}

function signIn() {
  sessionStore
    .getState()
    .setSession(
      { id: 'u1', fullName: 'Gal', email: 'gal@test.com', userType: 'regular', active: true },
      'token',
      new Date(Date.now() + 60_000).toISOString(),
      false,
    )
}

describe('ManualAbsence', { timeout: 20_000 }, () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    sessionStore.getState().clearSession()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('blocks submission and shows an error until a type is chosen', async () => {
    signIn()
    const fetchMock = mockFetch(() => ({ ok: true, status: 201, json: {} }))
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByText('יש לבחור סוג היעדרות')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('selecting Vacation half-day sends type=VACATION halfDay=true with no endDate, and shows confirmation on success', async () => {
    signIn()
    const fetchMock = mockFetch(() => ({
      ok: true,
      status: 201,
      json: {
        id: 'a1',
        userId: 'u1',
        type: 'VACATION',
        startDate: '2026-08-18',
        endDate: '2026-08-18',
        halfDay: true,
        workingDaysCount: 1,
      },
    }))
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'סוג היעדרות' }))
    await user.click(await screen.findByRole('button', { name: /חופשה - חצי יום/ }))
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/absences')
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({ type: 'VACATION', halfDay: true })
    expect(body.endDate).toBeUndefined()

    expect(await screen.findByText(/הדיווח נשמר בהצלחה/)).toBeInTheDocument()
  })

  it('a Sick selection has no half-day choice and always submits halfDay=false', async () => {
    signIn()
    const fetchMock = mockFetch(() => ({
      ok: true,
      status: 201,
      json: {
        id: 'a2',
        userId: 'u1',
        type: 'SICK',
        startDate: '2026-08-18',
        endDate: '2026-08-18',
        halfDay: false,
        workingDaysCount: 1,
      },
    }))
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'סוג היעדרות' }))
    await user.click(await screen.findByRole('button', { name: /מחלה/ }))
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({ type: 'SICK', halfDay: false })
  })

  it('shows a conflict error against the specific date on 409', async () => {
    signIn()
    mockFetch(() => ({
      ok: false,
      status: 409,
      json: {
        error: {
          code: 'CONFLICT',
          message: 'clash',
          details: [{ field: '2026-08-18', message: 'התאריך חופף להיעדרות קיימת' }],
        },
      },
    }))
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'סוג היעדרות' }))
    await user.click(await screen.findByRole('button', { name: /מחלה/ }))
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByText(/התאריך חופף להיעדרות קיימת/)).toBeInTheDocument()
    expect(await screen.findByText('התאריכים חופפים לדיווח קיים')).toBeInTheDocument()
  })

  it('maps a 400 field error onto the matching form field, not the conflict list', async () => {
    signIn()
    mockFetch(() => ({
      ok: false,
      status: 400,
      json: {
        error: {
          code: 'BAD_REQUEST',
          message: 'invalid',
          details: [{ field: 'startDate', message: 'תאריך שגוי' }],
        },
      },
    }))
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'סוג היעדרות' }))
    await user.click(await screen.findByRole('button', { name: /מחלה/ }))
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByText('תאריך שגוי')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('the Work tab is disabled when there is nothing to switch to', () => {
    signIn()
    renderScreen()

    expect(screen.getByRole('tab', { name: 'דיווח עבודה' })).toBeDisabled()
  })

  it('enables and calls onSwitchToWork when provided', async () => {
    signIn()
    const onSwitchToWork = vi.fn()
    const user = userEvent.setup()
    renderScreen(vi.fn(), onSwitchToWork)

    const workTab = screen.getByRole('tab', { name: 'דיווח עבודה' })
    expect(workTab).not.toBeDisabled()
    await user.click(workTab)
    expect(onSwitchToWork).toHaveBeenCalled()
  })

  it('calls onClose when the close button is clicked', async () => {
    signIn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderScreen(onClose)

    await user.click(screen.getByRole('button', { name: 'סגירה' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('resets endDate when startDate moves past it, instead of leaving a stale invalid range', async () => {
    signIn()
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'סוג היעדרות' }))
    await user.click(await screen.findByRole('button', { name: /מחלה/ }))
    await user.click(screen.getByText('לדווח על היעדרות ליותר מיום אחד'))

    const endDateInput = screen.getByLabelText('תאריך סיום')
    await user.type(endDateInput, '20/08/2026{Enter}')
    expect(endDateInput).toHaveValue('20/08/2026')

    const startDateInput = screen.getByLabelText('תאריך התחלה')
    await user.clear(startDateInput)
    await user.type(startDateInput, '25/08/2026{Enter}')

    expect(screen.getByLabelText('תאריך סיום')).toHaveValue('')
  })
})
