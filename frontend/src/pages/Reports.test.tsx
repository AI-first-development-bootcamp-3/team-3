import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App, ConfigProvider } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      for (const [match, body] of Object.entries(handlers)) {
        if (url.includes(match)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => body,
          })
        }
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`))
    }),
  )
}

function mockReportingOptions() {
  mockFetch({
    '/me/reporting-options': options,
    '/reports?': savedReports,
    '/absences?': { absences: [] },
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
    expect(screen.getByRole('button', { name: 'כל הדיווחים' })).toBeDisabled()

    const clock = screen.getByRole('button', { name: /הפעלת שעון/ })
    expect(clock).toBeDisabled()
    expect(clock).toHaveAttribute('aria-disabled', 'true')
    expect(clock).toHaveAccessibleName(/בקרוב/)

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
})
