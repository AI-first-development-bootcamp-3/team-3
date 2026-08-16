import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App, ConfigProvider } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

function mockReportingOptions() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => options,
    }),
  )
}

function renderHome() {
  return render(
    <ConfigProvider>
      <App>
        <Reports />
      </App>
    </ConfigProvider>,
  )
}

describe('Reports home shell', () => {
  afterEach(() => {
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

    expect(screen.getByText('abra')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'דיווח שעות' })).toBeInTheDocument()
    expect(screen.getByTestId('month-label')).toHaveTextContent(dayjs().format('MMMM YYYY'))
    expect(screen.getByRole('button', { name: 'דיווח ידני' })).toBeInTheDocument()

    const clock = screen.getByRole('button', { name: /הפעלת שעון/ })
    expect(clock).toBeDisabled()
    expect(clock).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('בקרוב')).toBeInTheDocument()

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

  it('reveals the entry form on דיווח ידני and hides it on חזרה', async () => {
    signIn()
    mockReportingOptions()
    const user = userEvent.setup()
    renderHome()

    expect(screen.queryByLabelText('פירוט')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'דיווח ידני' }))
    expect(await screen.findByLabelText('פירוט')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'דיווח שעות' })).toBeInTheDocument()
    expect(screen.queryByText('אין דיווחים להצגה')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'חזרה' }))
    expect(screen.queryByLabelText('פירוט')).not.toBeInTheDocument()
    expect(screen.getByText('אין דיווחים להצגה')).toBeInTheDocument()
    expect(screen.getAllByText('אין נתונים עדיין')).toHaveLength(5)
  })
})
