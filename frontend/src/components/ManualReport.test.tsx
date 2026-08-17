import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App, ConfigProvider } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ManualReport from './ManualReport'
import { sessionStore } from '../services/sessionStore'

const options = {
  clients: [
    {
      id: 'client-1',
      name: 'אל-על',
      projects: [
        {
          id: 'project-1',
          name: 'Cargo',
          tasks: [
            { id: 'task-1', name: 'UI UX Design' },
            { id: 'task-2', name: 'Marketing' },
          ],
        },
      ],
    },
    {
      id: 'client-2',
      name: 'אברא',
      projects: [{ id: 'project-2', name: 'abra app', tasks: [{ id: 'task-3', name: 'Consulting' }] }],
    },
  ],
}

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

function renderScreen(onClose = vi.fn()) {
  return render(
    <ConfigProvider>
      <App>
        <ManualReport onClose={onClose} />
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

async function addProject(user: ReturnType<typeof userEvent.setup>, projectName: string, taskName: string) {
  await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
  await user.click(await screen.findByRole('button', { name: projectName }))
  await user.click(screen.getByRole('button', { name: 'המשך ובחר משימה' }))
  await user.click(await screen.findByRole('button', { name: taskName }))
  await user.click(screen.getByRole('button', { name: 'המשך ובחר מיקום' }))
  await user.click(await screen.findByRole('button', { name: 'משרד' }))
  await user.click(screen.getByRole('button', { name: 'המשך' }))
}

describe('ManualReport', { timeout: 20_000 }, () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    sessionStore.getState().clearSession()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('shows the day chrome with no project rows yet', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))

    renderScreen()

    expect(await screen.findByRole('heading', { name: 'דיווח ידני' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'דיווח עבודה' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('כניסה')).toBeInTheDocument()
    expect(screen.getByLabelText('יציאה')).toBeInTheDocument()
    expect(screen.queryByText('דיווח פרויקטים')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'הוספת פרויקט' })).toBeInTheDocument()
  })

  it('walks the stepped picker and shows the choices on the card', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    await addProject(user, 'Cargo', 'Marketing')

    expect(screen.getByText('דיווח פרויקטים')).toBeInTheDocument()
    expect(screen.getByText('אל-על')).toBeInTheDocument()
    expect(screen.getByText('Cargo')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
    expect(screen.getByText('משרד')).toBeInTheDocument()
  })

  it('saves every project of the day in one request', async () => {
    signIn()
    const fetchMock = mockFetch((url) =>
      url.includes('/reports/batch')
        ? { ok: true, status: 201, json: { reports: [] } }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })

    fireEvent.change(screen.getByLabelText('כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('יציאה'), { target: { value: '18:00' } })

    await addProject(user, 'Cargo', 'Marketing')
    fireEvent.change(screen.getByLabelText('שעת התחלה 1'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת סיום 1'), { target: { value: '13:00' } })

    await addProject(user, 'abra app', 'Consulting')
    fireEvent.change(screen.getByLabelText('שעת התחלה 2'), { target: { value: '13:00' } })
    fireEvent.change(screen.getByLabelText('שעת סיום 2'), { target: { value: '18:00' } })

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/reports/batch'),
        expect.objectContaining({ method: 'POST' }),
      )
    })

    const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/reports/batch'))
    const body = JSON.parse(String((call?.[1] as RequestInit).body))
    expect(body.rows).toHaveLength(2)
    expect(body.rows[0]).toMatchObject({ projectId: 'project-1', taskId: 'task-2', startTime: '09:00' })
    expect(body.rows[1]).toMatchObject({ projectId: 'project-2', taskId: 'task-3', endTime: '18:00' })
  })

  it('asks before removing a project and keeps the others', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    await addProject(user, 'Cargo', 'Marketing')
    await addProject(user, 'abra app', 'Consulting')

    await user.click(screen.getAllByRole('button', { name: 'מחיקת פרויקט' })[0])
    await user.click(await screen.findByRole('button', { name: 'מעדיף שלא למחוק' }))
    expect(screen.getAllByRole('button', { name: 'מחיקת פרויקט' })).toHaveLength(2)

    await user.click(screen.getAllByRole('button', { name: 'מחיקת פרויקט' })[0])
    await user.click(await screen.findByRole('button', { name: 'מחק את הפרויקט' }))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'מחיקת פרויקט' })).toHaveLength(1)
    })
    expect(screen.getByText('Consulting')).toBeInTheDocument()
  })

  it('does not send an incomplete day', async () => {
    signIn()
    const fetchMock = mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await user.click(await screen.findByRole('button', { name: 'הוספת פרויקט' }))
    await user.click(screen.getByRole('button', { name: 'חזרה' }))
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('חסר לנו פרט או שניים')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(false)
  })

  it('tells the user to wait when the server throttles the save', async () => {
    signIn()
    mockFetch((url) =>
      url.includes('/reports/batch')
        ? {
            ok: false,
            status: 429,
            json: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts.' } },
          }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })

    fireEvent.change(screen.getByLabelText('כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('יציאה'), { target: { value: '18:00' } })
    await addProject(user, 'Cargo', 'Marketing')
    fireEvent.change(screen.getByLabelText('שעת התחלה 1'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת סיום 1'), { target: { value: '13:00' } })

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('שמרתם יותר מדי פעמים ברצף')
  })
})
