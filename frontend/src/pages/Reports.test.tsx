import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App, ConfigProvider } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Reports from './Reports'
import { sessionStore } from '../services/sessionStore'
import dayjs from '../services/dayjs'

const KPI_LABELS = [
  'שעות חודשיות',
  'ימי חופשה',
  'ימי מחלה',
  'דיווחים חסרים',
  'פרויקטים מדווחים',
]

const options = {
  clients: [
    {
      id: 'client-1',
      name: 'Acme',
      projects: [{ id: 'project-1', name: 'Website', tasks: [{ id: 'task-1', name: 'Design' }] }],
    },
  ],
}

const savedReports = {
  reports: [
    {
      id: 'r1',
      userId: 'u1',
      clientId: 'client-1',
      projectId: 'project-1',
      taskId: 'task-1',
      date: '2026-08-17',
      workLocation: 'CLIENT',
      startTime: '09:00',
      endTime: '18:00',
      hours: 9,
      description: 'Saved',
      clientName: 'Acme',
      projectName: 'Website',
      taskName: 'Design',
      durationHours: 9,
    },
  ],
}

function mockFetch(handlers: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      for (const [match, body] of Object.entries(handlers)) {
        if (!url.includes(match)) continue
        if (match.includes(':POST') && method !== 'POST') continue
        if (match.includes(':GET') && method !== 'GET') continue
        const key = match.replace(/:(GET|POST)$/, '')
        if (!url.includes(key)) continue
        if (typeof body === 'object' && body !== null && 'status' in body) {
          const response = body as { status: number; body?: unknown }
          return Promise.resolve({
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => response.body,
          })
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => body,
        })
      }
      if (method === 'POST' && url.includes('/me/clock/')) {
        return Promise.resolve({
          ok: true,
          status: 204,
          headers: new Headers(),
          json: async () => undefined,
        })
      }
      return Promise.reject(new Error(`Unhandled fetch: ${method} ${url}`))
    }),
  )
}

function mockReportingOptions(extra: Record<string, unknown> = {}) {
  mockFetch({
    '/me/reporting-options': options,
    '/me/clock/session': { session: null },
    '/reports?': savedReports,
    '/absences?': { absences: [] },
    ...extra,
  })
}

function renderHome() {
  return render(
    <ConfigProvider>
      <App>
        <MemoryRouter>
          <Reports />
        </MemoryRouter>
      </App>
    </ConfigProvider>,
  )
}

describe('Reports home shell', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
    cleanup()
    vi.unstubAllGlobals()
    sessionStore.getState().clearSession()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  function signIn() {
    sessionStore.getState().setSession(
      { id: 'u1', fullName: 'Gal', email: 'gal@test.com', userType: 'regular', active: true },
      'token',
      new Date(Date.now() + 60_000).toISOString(),
      false,
    )
  }

  it('shows Figma chrome, five empty KPI cards, and an empty daily list', () => {
    renderHome()

    expect(screen.getByRole('img', { name: 'abra' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'דיווח שעות' })).toBeInTheDocument()
    expect(screen.getByTestId('month-label')).toHaveTextContent(dayjs().format('MMMM'))
    expect(screen.getByRole('button', { name: 'דיווח ידני' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'כל הדיווחים' })).toBeEnabled()

    const clock = screen.getByRole('button', { name: /הפעלת שעון/ })
    expect(clock).toBeDisabled()

    for (const label of KPI_LABELS) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument()
    }
    expect(screen.getAllByText('אין נתונים עדיין')).toHaveLength(5)
    expect(screen.queryByText('142.5')).not.toBeInTheDocument()
    expect(screen.queryByText('180')).not.toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'פירוט יומי' })).toBeInTheDocument()
    expect(screen.getByText('אין דיווחים להצגה')).toBeInTheDocument()
  })

  it('advances the month label without changing empty copy', async () => {
    const user = userEvent.setup()
    renderHome()

    const label = screen.getByTestId('month-label')
    const before = label.textContent
    await user.click(screen.getByRole('button', { name: 'חודש הבא' }))
    expect(label.textContent).not.toBe(before)
    expect(screen.getAllByText('אין נתונים עדיין')).toHaveLength(5)
    expect(screen.getByText('אין דיווחים להצגה')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'חודש קודם' }))
    expect(label).toHaveTextContent(before ?? '')
  })

  it('renders the Figma preview rows only when ?demo=1 asks for them', () => {
    renderHome()
    expect(screen.queryByText('חסר')).not.toBeInTheDocument()
    cleanup()

    window.history.replaceState({}, '', '/?demo=1')
    renderHome()

    expect(screen.getByText('96')).toBeInTheDocument()
    expect(screen.queryByText('142.5')).not.toBeInTheDocument()
    expect(screen.getAllByText('חסר')).toHaveLength(2)
    expect(screen.getAllByText('9 שעות')).toHaveLength(2)
    expect(screen.getByText('5.5 שעות')).toBeInTheDocument()
    expect(screen.getByText('4 שעות')).toBeInTheDocument()
    expect(screen.getAllByText('סופ״ש')).toHaveLength(2)
    expect(screen.queryByText('אין דיווחים להצגה')).not.toBeInTheDocument()
  })

  it('shows saved report days from the monthly list API', async () => {
    signIn()
    mockReportingOptions()
    renderHome()

    expect(await screen.findByText('9 שעות')).toBeInTheDocument()
    expect(screen.getByText('1 פרויקט מדווח')).toBeInTheDocument()
    expect(screen.queryByText('אין דיווחים להצגה')).not.toBeInTheDocument()

    const hoursCard = screen.getByRole('heading', { name: 'שעות חודשיות' }).closest('article')
    expect(hoursCard).not.toBeNull()
    expect(within(hoursCard!).getByText('9')).toBeInTheDocument()
    expect(within(hoursCard!).getByText(/מתוך/)).toBeInTheDocument()
    expect(screen.queryByText('אין נתונים עדיין')).not.toBeInTheDocument()
  })

  it('dims every day row when the month is locked', async () => {
    signIn()
    mockReportingOptions({
      '/reports?': { ...savedReports, monthLocked: true },
    })
    renderHome()

    expect(await screen.findByText('9 שעות')).toBeInTheDocument()
    const rows = screen.getAllByRole('button').filter((button) => button.classList.contains('home-shell__day'))
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row).toHaveClass('home-shell__day--locked')
    }
  })

  it('shows an absence type badge for each working day of a saved absence', async () => {
    signIn()
    mockFetch({
      '/me/reporting-options': options,
      '/reports?': { reports: [] },
      '/absences?': {
        absences: [
          {
            id: 'a1',
            userId: 'u1',
            type: 'SICK',
            startDate: '2026-08-12',
            endDate: '2026-08-12',
            halfDay: false,
            workingDayCount: 1,
          },
        ],
      },
    })
    renderHome()

    expect(await screen.findByText('מחלה 😷')).toBeInTheDocument()
  })

  it('opens a blank absence form from the general דיווח ידני button even when today already has a saved absence', async () => {
    signIn()
    const today = dayjs().format('YYYY-MM-DD')
    mockFetch({
      '/me/reporting-options': options,
      '/reports?': { reports: [] },
      '/absences?': {
        absences: [
          {
            id: 'a1',
            userId: 'u1',
            type: 'SICK',
            startDate: today,
            endDate: today,
            halfDay: false,
            workingDayCount: 1,
            attachments: [{ id: 'att-1', filename: 'note.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: today }],
          },
        ],
      },
    })
    const user = userEvent.setup()
    renderHome()

    await user.click(await screen.findByRole('button', { name: 'דיווח ידני' }))
    await user.click(await screen.findByRole('tab', { name: 'דיווח העדרות' }))

    expect(screen.getByLabelText('סוג היעדרות')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'דיווח על היעדרות ליותר מיום אחד' })).toBeInTheDocument()
    expect(screen.queryByText('note.pdf')).not.toBeInTheDocument()
  })

  it('opens that day\'s own saved absence in edit mode when its row is clicked directly', async () => {
    signIn()
    const today = dayjs().format('YYYY-MM-DD')
    mockFetch({
      '/me/reporting-options': options,
      '/reports?': { reports: [] },
      '/absences?': {
        absences: [
          {
            id: 'a1',
            userId: 'u1',
            type: 'SICK',
            startDate: today,
            endDate: today,
            halfDay: false,
            workingDayCount: 1,
            attachments: [],
          },
        ],
      },
    })
    const user = userEvent.setup()
    renderHome()

    const dayRow = (await screen.findByText('מחלה 😷')).closest('button')
    expect(dayRow).not.toBeNull()
    await user.click(dayRow!)
    await user.click(await screen.findByRole('tab', { name: 'דיווח העדרות' }))

    expect(screen.getByLabelText('סוג היעדרות')).toHaveValue('SICK')
    expect(screen.queryByRole('button', { name: 'דיווח על היעדרות ליותר מיום אחד' })).not.toBeInTheDocument()
  })

  it('inserts סופ״ש rows for Fridays and Saturdays that already happened this month', async () => {
    signIn()
    mockFetch({
      '/me/reporting-options': options,
      '/reports?': { reports: [] },
      '/absences?': { absences: [] },
    })
    renderHome()

    const weekendBadges = await screen.findAllByText('סופ״ש')
    expect(weekendBadges.length).toBeGreaterThan(0)
  })

  it('opens the side panel on דיווח ידני while keeping the home shell visible and interactive', async () => {
    signIn()
    mockReportingOptions()
    const user = userEvent.setup()
    renderHome()

    await user.click(screen.getByRole('button', { name: 'דיווח ידני' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'דיווח ידני' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'דיווח שעות' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'חודש הבא' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'סגירה' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'חודש קודם' }))
    expect(await screen.findByText('9 שעות')).toBeInTheDocument()
  })

  it('opens a saved day filled with the reported project, task, and hours', async () => {
    signIn()
    mockReportingOptions()
    const user = userEvent.setup()
    renderHome()

    await user.click(await screen.findByRole('button', { name: /17\/08\/26/ }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).queryByText('עדיין אין פרויקטים מדווחים')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('פרויקט 1')).toHaveValue('client-1:project-1')
    expect(within(dialog).getByLabelText('משימה 1')).toHaveValue('task-1')
    expect(within(dialog).getByLabelText('מיקום 1')).toHaveValue('CLIENT')
    expect(within(dialog).getByLabelText('שעות 1')).toHaveValue('9')
    expect(within(dialog).getByLabelText('פירוט 1')).toHaveValue('Saved')
  })

  it('does not stack project cards when a day is closed and opened again after deleting a card', async () => {
    signIn()
    mockReportingOptions()
    const user = userEvent.setup()
    renderHome()

    await user.click(await screen.findByRole('button', { name: /17\/08\/26/ }))
    const firstOpen = await screen.findByRole('dialog')
    expect(within(firstOpen).getByLabelText('שעות 1')).toHaveValue('9')

    await user.click(within(firstOpen).getByRole('button', { name: 'מחיקת פרויקט' }))
    await user.click(await screen.findByRole('button', { name: 'מחק את הפרויקט' }))
    expect(within(firstOpen).queryByLabelText('פרויקט 1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'סגירה' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /17\/08\/26/ }))
    const secondOpen = await screen.findByRole('dialog')
    expect(within(secondOpen).getAllByLabelText(/פרויקט/)).toHaveLength(1)
    expect(within(secondOpen).getByLabelText('שעות 1')).toHaveValue('9')
    expect(within(secondOpen).getByText('סה״כ 9 שעות')).toBeInTheDocument()
  })

  it('starts the work clock when signed in and idle', async () => {
    signIn()
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method ?? 'GET'
        if (method === 'POST' && url.includes('/me/clock/start')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              session: {
                sessionId: 's1',
                status: 'ACTIVE',
                startedAt: new Date().toISOString(),
                stoppedAt: null,
                autoStopped: false,
                segments: [],
              },
            }),
          })
        }
        if (url.includes('/me/clock/session')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ session: null }),
          })
        }
        if (url.includes('/me/reporting-options')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => options,
          })
        }
        if (url.includes('/reports?')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => savedReports,
          })
        }
        if (url.includes('/absences?')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ absences: [] }),
          })
        }
        return Promise.reject(new Error(`Unhandled fetch: ${method} ${url}`))
      }),
    )
    renderHome()

    const start = await screen.findByRole('button', { name: /הפעלת שעון/ })
    expect(start).toBeEnabled()
    await user.click(start)
    expect(await screen.findByRole('button', { name: 'עצור שעון' })).toBeInTheDocument()
    expect(screen.getByTestId('clock-elapsed')).toHaveTextContent(/^\d{2}:\d{2}:\d{2}$/)
    expect(screen.getByRole('button', { name: 'דיווח ידני' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /הפעלת שעון/ })).not.toBeInTheDocument()
  })

  it('opens the stop modal, then returns to idle after discard', async () => {
    signIn()
    const user = userEvent.setup()
    let clockSession: Record<string, unknown> | null = null
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method ?? 'GET'
        if (method === 'POST' && url.includes('/me/clock/start')) {
          clockSession = {
            sessionId: 's1',
            status: 'ACTIVE',
            startedAt: new Date().toISOString(),
            stoppedAt: null,
            autoStopped: false,
            segments: [],
          }
          return Promise.resolve({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ session: clockSession }),
          })
        }
        if (method === 'POST' && url.includes('/me/clock/stop')) {
          clockSession = {
            sessionId: 's1',
            status: 'AWAITING_CONFIRM',
            startedAt: new Date().toISOString(),
            stoppedAt: new Date().toISOString(),
            autoStopped: false,
            segments: [{ date: '2026-08-18', startTime: '16:00', endTime: '16:05', durationMinutes: 5 }],
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ session: clockSession }),
          })
        }
        if (method === 'POST' && url.includes('/me/clock/discard')) {
          clockSession = null
          return Promise.resolve({ ok: true, status: 204, headers: new Headers(), json: async () => undefined })
        }
        if (url.includes('/me/clock/session')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ session: clockSession }),
          })
        }
        if (url.includes('/me/reporting-options')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => options,
          })
        }
        if (url.includes('/reports?')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => savedReports,
          })
        }
        if (url.includes('/absences?')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ absences: [] }),
          })
        }
        return Promise.reject(new Error(`Unhandled fetch: ${method} ${url}`))
      }),
    )
    renderHome()

    await user.click(await screen.findByRole('button', { name: /הפעלת שעון/ }))
    await user.click(await screen.findByRole('button', { name: 'עצור שעון' }))

    const stopDialog = await screen.findByRole('dialog', { name: 'סיום שעון עבודה' })
    expect(stopDialog).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /הפעלת שעון/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ביטול ללא שמירה' }))
    expect(await screen.findByRole('button', { name: /הפעלת שעון/ })).toBeEnabled()
    expect(screen.queryByRole('dialog', { name: 'סיום שעון עבודה' })).not.toBeInTheDocument()
  })

  it('opens the confirm modal on load when a session is awaiting confirm', async () => {
    signIn()
    mockReportingOptions({
      '/me/clock/session': {
        session: {
          sessionId: 's-eod',
          status: 'AWAITING_CONFIRM',
          startedAt: '2026-08-18T06:00:00.000Z',
          stoppedAt: '2026-08-18T20:59:00.000Z',
          autoStopped: true,
          segments: [{ date: '2026-08-18', startTime: '09:00', endTime: '23:59', durationMinutes: 899 }],
        },
      },
    })
    renderHome()

    expect(await screen.findByRole('dialog', { name: 'סיום שעון עבודה' })).toBeInTheDocument()
    expect(screen.getByText(/נעצר אוטומטית/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /הפעלת שעון/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'דיווח ידני' })).toBeEnabled()
  })

  it('opens the side panel from a demo day row with form-derived status', async () => {
    signIn()
    mockReportingOptions()
    window.history.replaceState({}, '', '/?demo=1')
    const user = userEvent.setup()
    renderHome()

    await user.click(screen.getByRole('button', { name: /13\/08\/26, יום ה׳/ }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('חסר')).toBeInTheDocument()
    expect(within(dialog).queryByText('3 מקומות עבודה')).not.toBeInTheDocument()
  })

  describe('day-status filter', () => {
    // Pinned so the derived tones and the auto-inserted סופ״ש rows are the same
    // every run. Only Date is faked — the panel's slide-out timer stays real.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-08-31T09:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    function reportRow(
      id: string,
      date: string,
      startTime: string,
      endTime: string,
      hours: number,
    ) {
      return {
        id,
        userId: 'u1',
        clientId: 'client-1',
        projectId: 'project-1',
        taskId: 'task-1',
        date,
        workLocation: 'OFFICE',
        startTime,
        endTime,
        hours,
        description: 'Saved',
        clientName: 'Acme',
        projectName: 'Website',
        taskName: 'Design',
        durationHours: hours,
      }
    }

    /** One month carrying every tone: full, missing, partial, absence, weekend. */
    function mockMixedMonth({ withAbsence = true } = {}) {
      mockFetch({
        '/me/reporting-options': options,
        '/reports?': {
          reports: [
            reportRow('r-full', '2026-08-17', '09:00', '18:00', 9),
            reportRow('r-missing', '2026-08-18', '09:00', '18:00', 4),
            reportRow('r-partial', '2026-08-19', '09:00', '14:00', 5),
          ],
        },
        '/absences?': {
          absences: withAbsence
            ? [
                {
                  id: 'a1',
                  userId: 'u1',
                  type: 'SICK',
                  startDate: '2026-08-20',
                  endDate: '2026-08-20',
                  halfDay: false,
                  workingDayCount: 1,
                },
              ]
            : [],
        },
      })
    }

    async function chooseFilter(user: ReturnType<typeof userEvent.setup>, label: string) {
      await user.click(screen.getByTestId('status-filter'))
      await user.click(screen.getByRole('option', { name: label }))
    }

    it('narrows the list to one status and names it on the pill', async () => {
      signIn()
      mockMixedMonth()
      const user = userEvent.setup()
      renderHome()

      expect(await screen.findByText('9 שעות')).toBeInTheDocument()
      expect(screen.getByText('חסר')).toBeInTheDocument()
      expect(screen.getByText('5 שעות')).toBeInTheDocument()

      await chooseFilter(user, 'חסר')

      expect(screen.getByTestId('status-filter')).toHaveTextContent('חסר')
      expect(screen.getByRole('button', { name: /18\/08\/26/ })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /17\/08\/26/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /19\/08\/26/ })).not.toBeInTheDocument()
      expect(screen.queryByText('אין דיווחים להצגה')).not.toBeInTheDocument()
    })

    it('leaves a surviving row exactly as it renders unfiltered', async () => {
      signIn()
      mockMixedMonth()
      const user = userEvent.setup()
      renderHome()

      const unfiltered = (await screen.findByRole('button', { name: /18\/08\/26/ })).textContent

      await chooseFilter(user, 'חסר')

      expect(screen.getByRole('button', { name: /18\/08\/26/ }).textContent).toBe(unfiltered)
    })

    it('offers only statuses the day rows already render', async () => {
      signIn()
      mockMixedMonth()
      const user = userEvent.setup()
      renderHome()

      await screen.findByText('9 שעות')
      await user.click(screen.getByTestId('status-filter'))

      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'כל הדיווחים',
        'חסר',
        'מלא',
        'חלקי',
        'סופ״ש',
        'חופשה 🏖️',
        'מחלה 😷',
        'מילואים 🚨',
        'אחר',
      ])
    })

    it('keeps weekends and absences out of חסר', async () => {
      signIn()
      mockMixedMonth()
      const user = userEvent.setup()
      renderHome()

      await screen.findByText('9 שעות')
      expect(screen.getAllByText('סופ״ש').length).toBeGreaterThan(0)
      expect(screen.getByText('מחלה 😷')).toBeInTheDocument()

      await chooseFilter(user, 'חסר')
      expect(screen.queryByText('סופ״ש')).not.toBeInTheDocument()
      expect(screen.queryByText('מחלה 😷')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /18\/08\/26/ })).toBeInTheDocument()

      await chooseFilter(user, 'סופ״ש')
      expect(screen.getAllByText('סופ״ש').length).toBeGreaterThan(0)
      expect(screen.queryByText('מחלה 😷')).not.toBeInTheDocument()
      expect(screen.queryByText('9 שעות')).not.toBeInTheDocument()
    })

    it('separates absence days by type', async () => {
      signIn()
      mockMixedMonth()
      const user = userEvent.setup()
      renderHome()

      await screen.findByText('9 שעות')

      // The pill itself now reads מחלה 😷, so the day row is matched by its date.
      await chooseFilter(user, 'מחלה 😷')
      expect(screen.getByTestId('status-filter')).toHaveTextContent('מחלה 😷')
      expect(screen.getByRole('button', { name: /20\/08\/26/ })).toBeInTheDocument()
      expect(screen.queryByText('סופ״ש')).not.toBeInTheDocument()
      expect(screen.queryByText('9 שעות')).not.toBeInTheDocument()

      // A sick day must not answer to חופשה, even though both are absences.
      await chooseFilter(user, 'חופשה 🏖️')
      expect(screen.getByText('לא נמצאו ימים התואמים לסינון')).toBeInTheDocument()
    })

    it('separates reported days by how complete they are', async () => {
      signIn()
      mockMixedMonth()
      const user = userEvent.setup()
      renderHome()

      await screen.findByText('9 שעות')

      // The row keeps its hours label; only the pill speaks in מלא / חלקי.
      await chooseFilter(user, 'מלא')
      expect(screen.getByText('9 שעות')).toBeInTheDocument()
      expect(screen.queryByText('5 שעות')).not.toBeInTheDocument()
      expect(screen.queryByText('חסר')).not.toBeInTheDocument()

      await chooseFilter(user, 'חלקי')
      expect(screen.getByText('5 שעות')).toBeInTheDocument()
      expect(screen.queryByText('9 שעות')).not.toBeInTheDocument()
    })

    it('carries the filter across a month change', async () => {
      signIn()
      mockMixedMonth()
      const user = userEvent.setup()
      renderHome()

      await screen.findByText('9 שעות')
      await chooseFilter(user, 'חסר')
      expect(screen.getByTestId('status-filter')).toHaveTextContent('חסר')

      await user.click(screen.getByRole('button', { name: 'חודש הבא' }))

      expect(screen.getByTestId('status-filter')).toHaveTextContent('חסר')
      expect(await screen.findByText('לא נמצאו ימים התואמים לסינון')).toBeInTheDocument()
    })

    it('says so when nothing matches, and lets the filter be changed back', async () => {
      signIn()
      mockMixedMonth({ withAbsence: false })
      const user = userEvent.setup()
      renderHome()

      await screen.findByText('9 שעות')
      await chooseFilter(user, 'מחלה 😷')

      expect(screen.getByText('לא נמצאו ימים התואמים לסינון')).toBeInTheDocument()
      expect(screen.queryByText('אין דיווחים להצגה')).not.toBeInTheDocument()

      await chooseFilter(user, 'כל הדיווחים')

      expect(screen.getByText('9 שעות')).toBeInTheDocument()
      expect(screen.queryByText('לא נמצאו ימים התואמים לסינון')).not.toBeInTheDocument()
    })

    it('keeps the KPI cards on the whole month while filtered', async () => {
      signIn()
      mockMixedMonth()
      const user = userEvent.setup()
      renderHome()

      await screen.findByText('9 שעות')
      const hoursCard = screen.getByRole('heading', { name: 'שעות חודשיות' }).closest('article')
      const before = hoursCard?.textContent

      await chooseFilter(user, 'חסר')

      expect(
        screen.getByRole('heading', { name: 'שעות חודשיות' }).closest('article')?.textContent,
      ).toBe(before)
    })

    it('opens a filtered day with that day’s full set of reports', async () => {
      signIn()
      mockMixedMonth()
      const user = userEvent.setup()
      renderHome()

      await screen.findByText('9 שעות')
      await chooseFilter(user, 'חסר')

      await user.click(screen.getByRole('button', { name: /18\/08\/26/ }))
      const dialog = await screen.findByRole('dialog')

      expect(within(dialog).getByLabelText('פרויקט 1')).toHaveValue('client-1:project-1')
      expect(within(dialog).getByLabelText('שעות 1')).toHaveValue('4')
      expect(within(dialog).getByLabelText('פירוט 1')).toHaveValue('Saved')
    })

    it('sends no request when the filter changes', async () => {
      signIn()
      mockMixedMonth()
      const user = userEvent.setup()
      renderHome()

      await screen.findByText('9 שעות')
      const fetchMock = vi.mocked(globalThis.fetch)
      const before = fetchMock.mock.calls.length

      await chooseFilter(user, 'חסר')
      await chooseFilter(user, 'סופ״ש')

      expect(fetchMock.mock.calls.length).toBe(before)
    })

    it('closes on Escape without changing the selection', async () => {
      signIn()
      mockMixedMonth()
      const user = userEvent.setup()
      renderHome()

      await screen.findByText('9 שעות')
      await chooseFilter(user, 'חסר')

      await user.click(screen.getByTestId('status-filter'))
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      expect(screen.getByTestId('status-filter')).toHaveTextContent('חסר')
      expect(screen.getByTestId('status-filter')).toHaveFocus()
    })
  })
})
