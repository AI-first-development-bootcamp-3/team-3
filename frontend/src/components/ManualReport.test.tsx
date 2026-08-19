import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
          reportFormat: 'SUM_HOURS',
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
      projects: [
        { id: 'project-2', name: 'abra app', reportFormat: 'SUM_HOURS', tasks: [{ id: 'task-3', name: 'Consulting' }] },
      ],
    },
    {
      id: 'client-3',
      name: 'נמל אשדוד',
      projects: [
        { id: 'project-3', name: 'משמרות', reportFormat: 'CLOCK_IN_OUT', tasks: [{ id: 'task-4', name: 'Shifts' }] },
        { id: 'project-4', name: 'משמרות ערב', reportFormat: 'CLOCK_IN_OUT', tasks: [{ id: 'task-5', name: 'Night' }] },
      ],
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

function renderScreen(
  onClose = vi.fn(),
  props: {
    initialDate?: string
    initialReports?: Parameters<typeof ManualReport>[0]['initialReports']
    initialAbsences?: Parameters<typeof ManualReport>[0]['initialAbsences']
    allowAbsenceTab?: boolean
  } = {},
) {
  return render(
    <ConfigProvider>
      <App>
        <ManualReport onClose={onClose} {...props} />
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

async function fillCard(
  user: ReturnType<typeof userEvent.setup>,
  index: number,
  projectValue: string,
  taskValue: string | null,
  hours: string,
) {
  await user.selectOptions(screen.getByLabelText(`פרויקט ${index}`), projectValue)
  if (taskValue) {
    await user.selectOptions(screen.getByLabelText(`משימה ${index}`), taskValue)
  }
  await user.selectOptions(screen.getByLabelText(`מיקום ${index}`), 'OFFICE')
  const hoursInput = screen.getByLabelText(`שעות ${index}`)
  await user.clear(hoursInput)
  await user.type(hoursInput, hours)
}

/** Fills a card of a כניסה/יציאה project: pickers, then its own clock pair. */
async function fillClockCard(
  user: ReturnType<typeof userEvent.setup>,
  index: number,
  projectValue: string,
  rowStart: string,
  rowEnd: string,
) {
  await user.selectOptions(screen.getByLabelText(`פרויקט ${index}`), projectValue)
  await user.selectOptions(screen.getByLabelText(`מיקום ${index}`), 'OFFICE')
  fireEvent.change(screen.getByLabelText(`כניסה ${index}`), { target: { value: rowStart } })
  fireEvent.change(screen.getByLabelText(`יציאה ${index}`), { target: { value: rowEnd } })
}

/** One row of a day already stored, as the list endpoint hands it back. A row
 * carrying `rowStartTime` was reported as כניסה/יציאה, one without it as
 * סיכום שעות — whatever its project is set to today. */
function savedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    userId: 'u1',
    clientId: 'client-1',
    projectId: 'project-1',
    taskId: 'task-2',
    date: '2026-08-17',
    workLocation: 'OFFICE' as const,
    startTime: '09:00',
    endTime: '18:00',
    hours: 4,
    description: 'Saved',
    clientName: 'אל-על',
    projectName: 'Cargo',
    taskName: 'Marketing',
    durationHours: 4,
    ...overrides,
  }
}

function batchBody(fetchMock: ReturnType<typeof mockFetch>) {
  const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/reports/batch'))
  return JSON.parse(String((call?.[1] as RequestInit).body))
}

describe('ManualReport', { timeout: 20_000 }, () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    sessionStore.getState().clearSession()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('shows the desktop day chrome with no project rows yet', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))

    renderScreen()

    expect(await screen.findByRole('tab', { name: 'דיווח ידני' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('שעת כניסה')).toBeInTheDocument()
    expect(screen.getByLabelText('שעת יציאה')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'פרויקטים' })).toBeInTheDocument()
    expect(screen.getByText('עדיין אין פרויקטים מדווחים')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'הוספת פרויקט' })).toBeInTheDocument()
  })

  it('shows saved project, task, location, and hours when opened with existing rows', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))

    renderScreen(vi.fn(), {
      initialDate: '2026-08-17',
      initialReports: [
        {
          id: 'r1',
          userId: 'u1',
          clientId: 'client-1',
          projectId: 'project-1',
          taskId: 'task-2',
          date: '2026-08-17',
          workLocation: 'HOME',
          startTime: '09:00',
          endTime: '18:00',
          hours: 9,
          description: 'Existing',
          clientName: 'אל-על',
          projectName: 'Cargo',
          taskName: 'Marketing',
          durationHours: 9,
        },
      ],
    })

    expect(await screen.findByLabelText('פרויקט 1')).toHaveValue('client-1:project-1')
    expect(screen.getByLabelText('משימה 1')).toHaveValue('task-2')
    expect(screen.getByLabelText('מיקום 1')).toHaveValue('HOME')
    expect(screen.getByLabelText('שעות 1')).toHaveValue('9')
    expect(screen.getByLabelText('פירוט 1')).toHaveValue('Existing')
    expect(screen.queryByText('עדיין אין פרויקטים מדווחים')).not.toBeInTheDocument()
  })

  it('keeps מחיקת דיווח disabled when the day was never saved', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))

    renderScreen()

    expect(await screen.findByRole('button', { name: 'מחיקת דיווח' })).toBeDisabled()
  })

  it('asks before deleting a saved day and does not call the API on cancel', async () => {
    signIn()
    const fetchMock = mockFetch((url) =>
      String(url).includes('/reports?date=')
        ? { ok: true, status: 204, json: null }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()
    const saved = [
      {
        id: 'r1',
        userId: 'u1',
        clientId: 'client-1',
        projectId: 'project-1',
        taskId: 'task-2',
        date: '2026-08-17',
        workLocation: 'HOME' as const,
        startTime: '09:00',
        endTime: '18:00',
        hours: 9,
        description: 'Existing',
        clientName: 'אל-על',
        projectName: 'Cargo',
        taskName: 'Marketing',
        durationHours: 9,
      },
    ]

    renderScreen(vi.fn(), { initialDate: '2026-08-17', initialReports: saved })
    await user.click(await screen.findByRole('button', { name: 'מחיקת דיווח' }))
    await user.click(await screen.findByRole('button', { name: 'מעדיף שלא למחוק' }))

    expect(screen.queryByRole('button', { name: 'מחק את הדיווח' })).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).includes('/reports?date=') && (init as RequestInit).method === 'DELETE')).toBe(false)
  })

  it('deletes the saved day after confirmation', async () => {
    signIn()
    const onClose = vi.fn()
    const fetchMock = mockFetch((url) =>
      String(url).includes('/reports?date=')
        ? { ok: true, status: 204, json: null }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen(onClose, {
      initialDate: '2026-08-17',
      initialReports: [
        {
          id: 'r1',
          userId: 'u1',
          clientId: 'client-1',
          projectId: 'project-1',
          taskId: 'task-2',
          date: '2026-08-17',
          workLocation: 'HOME',
          startTime: '09:00',
          endTime: '18:00',
          hours: 9,
          description: 'Existing',
          clientName: 'אל-על',
          projectName: 'Cargo',
          taskName: 'Marketing',
          durationHours: 9,
        },
      ],
    })

    await user.click(await screen.findByRole('button', { name: 'מחיקת דיווח' }))
    await user.click(await screen.findByRole('button', { name: 'מחק את הדיווח' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/reports?date=2026-08-17'),
        expect.objectContaining({ method: 'DELETE' }),
      )
    })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('cancels an absence covering the day after confirmation', async () => {
    signIn()
    const onClose = vi.fn()
    const fetchMock = mockFetch((url) =>
      String(url).includes('/absences/abs-1')
        ? { ok: true, status: 204, json: null }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen(onClose, {
      initialDate: '2026-08-25',
      initialAbsences: [
        {
          id: 'abs-1',
          userId: 'u1',
          type: 'VACATION',
          startDate: '2026-08-24',
          endDate: '2026-08-26',
          halfDay: false,
          workingDayCount: 3,
          attachments: [],
        },
      ],
    })

    expect(await screen.findByRole('button', { name: 'מחיקת דיווח' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'מחיקת דיווח' }))
    expect(screen.getByText('למחוק את דיווח ההיעדרות?')).toBeInTheDocument()
    expect(screen.getByText(/כל ימי הטווח/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'מחק היעדרות' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/absences/abs-1'),
        expect.objectContaining({ method: 'DELETE' }),
      )
    })
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => String(url).includes('/reports?date=') && (init as RequestInit).method === 'DELETE',
      ),
    ).toBe(false)
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('fills inline dropdowns and auto-selects a sole task', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await user.click(await screen.findByRole('button', { name: 'הוספת פרויקט' }))
    expect(screen.queryByRole('button', { name: 'המשך ובחר משימה' })).not.toBeInTheDocument()

    await fillCard(user, 1, 'client-1:project-1', 'task-2', '4')
    expect(screen.getByLabelText('משימה 1')).toHaveValue('task-2')

    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await user.selectOptions(screen.getByLabelText('פרויקט 2'), 'client-2:project-2')
    expect(screen.getByLabelText('משימה 2')).toHaveValue('task-3')
  })

  it('saves every project of the day in one request under the window', async () => {
    signIn()
    const onClose = vi.fn()
    const fetchMock = mockFetch((url) =>
      url.includes('/reports/batch')
        ? { ok: true, status: 201, json: { reports: [] } }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen(onClose)
    await screen.findByRole('button', { name: 'הוספת פרויקט' })

    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })

    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '5')
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 2, 'client-2:project-2', null, '4')

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/reports/batch'),
        expect.objectContaining({ method: 'POST' }),
      )
    })

    const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/reports/batch'))
    const body = JSON.parse(String((call?.[1] as RequestInit).body))
    expect(body).toMatchObject({ startTime: '09:00', endTime: '18:00' })
    expect(body.rows).toHaveLength(2)
    expect(body.rows[0]).toMatchObject({ projectId: 'project-1', taskId: 'task-2', hours: 5 })
    expect(body.rows[1]).toMatchObject({ projectId: 'project-2', taskId: 'task-3', hours: 4 })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('saves an overnight window without treating it as invalid', async () => {
    signIn()
    const fetchMock = mockFetch((url) =>
      url.includes('/reports/batch')
        ? { ok: true, status: 201, json: { reports: [] } }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '22:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '06:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '8')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(true)
    })
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/reports/batch'))
    const body = JSON.parse(String((call?.[1] as RequestInit).body))
    expect(body).toMatchObject({ startTime: '22:00', endTime: '06:00', rows: [{ hours: 8 }] })
  })

  it('asks before removing a project and keeps the others', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await user.click(await screen.findByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '4')
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 2, 'client-2:project-2', null, '3')

    await user.click(screen.getAllByRole('button', { name: 'מחיקת פרויקט' })[0])
    await user.click(await screen.findByRole('button', { name: 'מעדיף שלא למחוק' }))
    expect(screen.getAllByRole('button', { name: 'מחיקת פרויקט' })).toHaveLength(2)

    await user.click(screen.getAllByRole('button', { name: 'מחיקת פרויקט' })[0])
    await user.click(await screen.findByRole('button', { name: 'מחק את הפרויקט' }))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'מחיקת פרויקט' })).toHaveLength(1)
    })
    expect(screen.getByLabelText('משימה 1')).toHaveValue('task-3')
  })

  it('does not send an incomplete day', async () => {
    signIn()
    const fetchMock = mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await user.click(await screen.findByRole('button', { name: 'הוספת פרויקט' }))
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('חסר לנו פרט או שניים')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(false)
  })

  it('explains the missing assignment and blocks the save when the user has no projects', async () => {
    signIn()
    const fetchMock = mockFetch(() => ({ ok: true, status: 200, json: { clients: [] } }))
    const user = userEvent.setup()

    renderScreen()

    expect(await screen.findByText('עדיין לא שויכו לכם פרויקטים')).toBeInTheDocument()
    expect(
      screen.getByText('כדי לדווח שעות צריך שיוך לפרויקט. פנו למנהל ישיר ואפשר יהיה להתחיל לדווח.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('עדיין אין פרויקטים מדווחים')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'הוספת פרויקט' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('אין פרויקטים לדיווח')
    expect(alert).toHaveTextContent('פנו למנהל ישיר כדי שישייך אתכם לפרויקט')
    expect(screen.queryByText('חסר לנו פרט או שניים')).not.toBeInTheDocument()
    expect(screen.queryByText('יש להוסיף לפחות פרויקט אחד')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(false)
  })

  it('blocks the save on a saved day when the user no longer has any assigned project', async () => {
    signIn()
    const fetchMock = mockFetch(() => ({ ok: true, status: 200, json: { clients: [] } }))
    const user = userEvent.setup()

    renderScreen(vi.fn(), { initialDate: '2026-08-17', initialReports: [savedRow()] })

    expect(await screen.findByText('עדיין לא שויכו לכם פרויקטים לדיווח. פנו למנהל ישיר.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('אין פרויקטים לדיווח')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(false)
  })

  it('rejects hours with more than one decimal place', async () => {
    signIn()
    const fetchMock = mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await user.click(await screen.findByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '3.34')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('שעות לא תקינות')
    expect(alert).toHaveTextContent('יש להזין מספר בין 0.5 ל-24, עם לכל היותר ספרה אחת אחרי הנקודה')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(false)
  })

  it('explains when project hours exceed the attendance window', async () => {
    signIn()
    const fetchMock = mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '5')
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 2, 'client-2:project-2', null, '5')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('יותר מדי שעות בפרויקטים')
    expect(alert).toHaveTextContent('10')
    expect(alert).toHaveTextContent('9')
    expect(alert).toHaveTextContent('יש להפחית שעה אחת')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(false)
  })

  it('sends the chosen report date in the batch request', async () => {
    signIn()
    const fetchMock = mockFetch((url) =>
      url.includes('/reports/batch')
        ? { ok: true, status: 201, json: { reports: [] } }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })

    fireEvent.change(screen.getByLabelText('תאריך הדיווח'), { target: { value: '2026-08-20' } })
    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '9')

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/reports/batch'),
        expect.objectContaining({ method: 'POST' }),
      )
    })

    const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/reports/batch'))
    const body = JSON.parse(String((call?.[1] as RequestInit).body))
    expect(body.date).toBe('2026-08-20')
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

    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '9')

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('שמרתם יותר מדי פעמים ברצף')
  })

  it('tells the user the month is locked when save returns 409', async () => {
    signIn()
    mockFetch((url) =>
      url.includes('/reports/batch')
        ? {
            ok: false,
            status: 409,
            json: { error: { code: 'CONFLICT', message: 'החודש נעול — לא ניתן לדווח' } },
          }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '9')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('החודש נעול')
  })

  it('shows a red חסר badge when project hours are less than the attendance window', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '3.5')

    const summary = screen.getByText('סיכום').closest<HTMLElement>('.manual-report__summary')
    expect(summary).not.toBeNull()
    expect(within(summary!).getByText('סה״כ 3.5 שעות')).toBeInTheDocument()
    expect(within(summary!).getByText('חסר')).toBeInTheDocument()
    expect(screen.getAllByText('חסר').length).toBeGreaterThanOrEqual(2)
  })

  it('does not save while project hours are short of the attendance window', async () => {
    signIn()
    const fetchMock = mockFetch((url) =>
      url.includes('/reports/batch')
        ? { ok: true, status: 201, json: { reports: [] } }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '4')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('חסרות שעות בפרויקטים')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(false)
  })

  it('hides the summary חסר badge when project hours fill the attendance window', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '9')

    const summary = screen.getByText('סיכום').closest<HTMLElement>('.manual-report__summary')
    expect(summary).not.toBeNull()
    expect(within(summary!).queryByText('חסר')).not.toBeInTheDocument()
    expect(screen.getByText('מלא')).toBeInTheDocument()
  })

  it('does not show the summary חסר badge when project hours exceed the attendance window', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '9.5')

    const summary = screen.getByText('סיכום').closest<HTMLElement>('.manual-report__summary')
    expect(summary).not.toBeNull()
    expect(within(summary!).queryByText('חסר')).not.toBeInTheDocument()
  })

  it('shows the editable שעות field for a סיכום שעות project', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await user.click(await screen.findByRole('button', { name: 'הוספת פרויקט' }))
    await user.selectOptions(screen.getByLabelText('פרויקט 1'), 'client-1:project-1')

    expect(screen.getByLabelText('שעות 1').tagName).toBe('INPUT')
    expect(screen.queryByLabelText('כניסה 1')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('יציאה 1')).not.toBeInTheDocument()
  })

  it('shows a clock pair and read-only derived hours for a כניסה/יציאה project', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await user.click(await screen.findByRole('button', { name: 'הוספת פרויקט' }))
    await fillClockCard(user, 1, 'client-3:project-3', '09:00', '13:00')

    expect(screen.getByLabelText('משימה 1')).toHaveValue('task-4')
    const derived = screen.getByLabelText('שעות 1')
    expect(derived.tagName).toBe('OUTPUT')
    expect(derived).toHaveTextContent('4 שעות')
  })

  it('swaps the card inputs and clears the stale hours when the project format changes', async () => {
    signIn()
    const fetchMock = mockFetch((url) =>
      url.includes('/reports/batch')
        ? { ok: true, status: 201, json: { reports: [] } }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen()
    await user.click(await screen.findByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '4')
    expect(screen.getByLabelText('שעות 1')).toHaveValue('4')

    await user.selectOptions(screen.getByLabelText('פרויקט 1'), 'client-3:project-3')

    expect(screen.getByLabelText('כניסה 1')).toBeInTheDocument()
    expect(screen.getByLabelText('שעות 1').tagName).toBe('OUTPUT')

    fireEvent.change(screen.getByLabelText('כניסה 1'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('יציאה 1'), { target: { value: '12:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '12:00' } })
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(true)
    })
    expect(batchBody(fetchMock).rows[0]).toEqual({
      clientId: 'client-3',
      projectId: 'project-3',
      taskId: 'task-4',
      workLocation: 'OFFICE',
      rowStartTime: '09:00',
      rowEndTime: '12:00',
      description: '',
    })
  })

  it('clears the stale hours when the card goes back to a סיכום שעות project', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await user.click(await screen.findByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '4')
    await user.selectOptions(screen.getByLabelText('פרויקט 1'), 'client-3:project-3')
    await user.selectOptions(screen.getByLabelText('פרויקט 1'), 'client-1:project-1')

    expect(screen.getByLabelText('שעות 1').tagName).toBe('INPUT')
    expect(screen.getByLabelText('שעות 1')).toHaveValue('0')
  })

  it('does not save a clock pair that falls outside the day window', async () => {
    signIn()
    const fetchMock = mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillClockCard(user, 1, 'client-3:project-3', '08:00', '13:00')

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('שעות הפרויקט מחוץ לחלון היום')
    expect(
      screen.getByText('שעות הפרויקט חייבות להיות בתוך חלון הכניסה–יציאה של היום'),
    ).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(false)
  })

  it('marks both cards and blocks the save when two clock-in/out projects overlap', async () => {
    signIn()
    const fetchMock = mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillClockCard(user, 1, 'client-3:project-3', '09:00', '13:00')
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillClockCard(user, 2, 'client-3:project-4', '12:00', '17:00')

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('יש חפיפה בין הפרויקטים')
    expect(screen.getAllByText('שני פרויקטים לא יכולים להיות מדווחים על אותו פרק זמן')).toHaveLength(2)
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(false)
  })

  it('saves a mixed day of typed and clocked projects in one batch', async () => {
    signIn()
    const fetchMock = mockFetch((url) =>
      url.includes('/reports/batch')
        ? { ok: true, status: 201, json: { reports: [] } }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 1, 'client-1:project-1', 'task-2', '6')
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillClockCard(user, 2, 'client-3:project-3', '13:00', '16:00')

    const summary = screen.getByText('סיכום').closest<HTMLElement>('.manual-report__summary')
    expect(within(summary!).getByText('סה״כ 9 שעות')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(true)
    })
    const body = batchBody(fetchMock)
    expect(body).toMatchObject({ startTime: '09:00', endTime: '18:00' })
    expect(body.rows[0]).toMatchObject({ projectId: 'project-1', hours: 6 })
    expect(body.rows[0]).not.toHaveProperty('rowStartTime')
    expect(body.rows[1]).toMatchObject({ projectId: 'project-3', rowStartTime: '13:00', rowEndTime: '16:00' })
    expect(body.rows[1]).not.toHaveProperty('hours')
  })

  it('counts derived hours against the attendance window', async () => {
    signIn()
    const fetchMock = mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'הוספת פרויקט' })
    fireEvent.change(screen.getByLabelText('שעת כניסה'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('שעת יציאה'), { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillClockCard(user, 1, 'client-3:project-3', '09:00', '17:00')
    await user.click(screen.getByRole('button', { name: 'הוספת פרויקט' }))
    await fillCard(user, 2, 'client-1:project-1', 'task-2', '2')

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('יותר מדי שעות בפרויקטים')
    expect(alert).toHaveTextContent('10')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(false)
  })

  it('keeps a saved כניסה/יציאה row in its own format after its project became סיכום שעות', async () => {
    signIn()
    const fetchMock = mockFetch((url) =>
      url.includes('/reports/batch')
        ? { ok: true, status: 201, json: { reports: [] } }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen(vi.fn(), {
      initialDate: '2026-08-17',
      initialReports: [
        savedRow({ rowStartTime: '10:00', rowEndTime: '13:00', hours: 3, startTime: '10:00', endTime: '13:00' }),
      ],
    })

    expect(await screen.findByLabelText('כניסה 1')).toHaveValue('10:00')
    expect(screen.getByLabelText('יציאה 1')).toHaveValue('13:00')
    const derived = screen.getByLabelText('שעות 1')
    expect(derived.tagName).toBe('OUTPUT')
    expect(derived).toHaveTextContent('3 שעות')

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(true)
    })
    const row = batchBody(fetchMock).rows[0]
    expect(row).toMatchObject({ projectId: 'project-1', rowStartTime: '10:00', rowEndTime: '13:00' })
    expect(row).not.toHaveProperty('hours')
    expect(row).not.toHaveProperty('savedFormat')
  })

  it('keeps a saved סיכום שעות row in its own format after its project became כניסה/יציאה', async () => {
    signIn()
    const fetchMock = mockFetch((url) =>
      url.includes('/reports/batch')
        ? { ok: true, status: 201, json: { reports: [] } }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen(vi.fn(), {
      initialDate: '2026-08-17',
      initialReports: [
        savedRow({
          clientId: 'client-3',
          projectId: 'project-3',
          taskId: 'task-4',
          hours: 4,
          startTime: '09:00',
          endTime: '13:00',
        }),
      ],
    })

    const typed = await screen.findByLabelText('שעות 1')
    expect(typed.tagName).toBe('INPUT')
    expect(typed).toHaveValue('4')
    expect(screen.queryByLabelText('כניסה 1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(true)
    })
    const row = batchBody(fetchMock).rows[0]
    expect(row).toMatchObject({ projectId: 'project-3', hours: 4 })
    expect(row).not.toHaveProperty('rowStartTime')
    expect(row).not.toHaveProperty('savedFormat')
  })

  it('drops the saved format and clears the stale clock pair when the card picks another project', async () => {
    signIn()
    const fetchMock = mockFetch((url) =>
      url.includes('/reports/batch')
        ? { ok: true, status: 201, json: { reports: [] } }
        : { ok: true, status: 200, json: options },
    )
    const user = userEvent.setup()

    renderScreen(vi.fn(), {
      initialDate: '2026-08-17',
      initialReports: [
        savedRow({ rowStartTime: '10:00', rowEndTime: '13:00', hours: 3, startTime: '10:00', endTime: '13:00' }),
      ],
    })

    await screen.findByLabelText('כניסה 1')
    await user.selectOptions(screen.getByLabelText('פרויקט 1'), 'client-2:project-2')

    expect(screen.getByLabelText('שעות 1').tagName).toBe('INPUT')
    expect(screen.queryByLabelText('כניסה 1')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('יציאה 1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/reports/batch'))).toBe(true)
    })
    const row = batchBody(fetchMock).rows[0]
    expect(row).toMatchObject({ projectId: 'project-2', taskId: 'task-3', hours: 3 })
    expect(row).not.toHaveProperty('rowStartTime')
  })

  it('drops the saved format and clears the stale hours when the card picks a כניסה/יציאה project', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen(vi.fn(), {
      initialDate: '2026-08-17',
      initialReports: [savedRow({ clientId: 'client-3', projectId: 'project-3', taskId: 'task-4', hours: 4 })],
    })

    expect(await screen.findByLabelText('שעות 1')).toHaveValue('4')
    await user.selectOptions(screen.getByLabelText('פרויקט 1'), 'client-3:project-4')

    expect(screen.getByLabelText('כניסה 1')).toHaveValue('')
    expect(screen.getByLabelText('יציאה 1')).toHaveValue('')
    expect(screen.getByLabelText('שעות 1').tagName).toBe('OUTPUT')
    expect(screen.getByLabelText('שעות 1')).toHaveTextContent('0 שעות')
  })

  it('posts a Thursday–Sunday vacation with two working days from the absence tab', async () => {
    signIn()
    const fetchMock = mockFetch((url, init) => {
      if (String(url).includes('/absences') && init?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: {
            id: 'a1',
            userId: 'u1',
            type: 'VACATION',
            startDate: '2026-08-13',
            endDate: '2026-08-16',
            halfDay: false,
            workingDayCount: 2,
          },
        }
      }
      return { ok: true, status: 200, json: options }
    })
    const user = userEvent.setup()
    const onClose = vi.fn()

    renderScreen(onClose)
    await user.click(await screen.findByRole('tab', { name: 'דיווח העדרות' }))
    await user.selectOptions(screen.getByLabelText('סוג היעדרות'), 'VACATION_FULL')
    await user.click(screen.getByRole('button', { name: 'דיווח על היעדרות ליותר מיום אחד' }))
    fireEvent.change(screen.getByLabelText('מתאריך'), { target: { value: '2026-08-13' } })
    fireEvent.change(screen.getByLabelText('עד תאריך'), { target: { value: '2026-08-16' } })

    expect(screen.getByTestId('working-day-count')).toHaveTextContent('2 ימי עבודה')

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url, init]) => String(url).includes('/absences') && (init as RequestInit).method === 'POST')).toBe(
        true,
      )
    })
    const call = fetchMock.mock.calls.find(([url, init]) => String(url).includes('/absences') && (init as RequestInit).method === 'POST')
    expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
      type: 'VACATION',
      startDate: '2026-08-13',
      endDate: '2026-08-16',
      halfDay: false,
    })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('posts a half-day vacation and stays on the hours tab to finish 4.5 hours', async () => {
    signIn()
    const fetchMock = mockFetch((url, init) => {
      if (String(url).includes('/absences') && init?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: {
            id: 'a-half',
            userId: 'u1',
            type: 'VACATION',
            startDate: '2026-08-09',
            endDate: '2026-08-09',
            halfDay: true,
            workingDayCount: 0.5,
          },
        }
      }
      return { ok: true, status: 200, json: options }
    })
    const user = userEvent.setup()
    const onClose = vi.fn()

    renderScreen(onClose)
    await user.click(await screen.findByRole('tab', { name: 'דיווח העדרות' }))
    await user.selectOptions(screen.getByLabelText('סוג היעדרות'), 'VACATION_HALF')
    fireEvent.change(screen.getByLabelText('מתאריך'), { target: { value: '2026-08-09' } })
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => String(url).includes('/absences') && (init as RequestInit).method === 'POST',
        ),
      ).toBe(true)
    })
    const call = fetchMock.mock.calls.find(
      ([url, init]) => String(url).includes('/absences') && (init as RequestInit).method === 'POST',
    )
    expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
      type: 'VACATION',
      startDate: '2026-08-09',
      endDate: '2026-08-09',
      halfDay: true,
    })
    expect(onClose).not.toHaveBeenCalled()
    expect(await screen.findByRole('heading', { name: 'חצי יום חופשה נשמר' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'דיווח ידני' })).toHaveAttribute('aria-selected', 'true')
  })

  it('defaults the absence tab to one-day mode and reveals the end date only after the more-days link is clicked', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen()
    await user.click(await screen.findByRole('tab', { name: 'דיווח העדרות' }))

    expect(screen.getByLabelText('מתאריך')).toBeInTheDocument()
    expect(screen.queryByLabelText('עד תאריך')).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'חופשה - חצי יום 🏖️' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'חופשה - יום מלא 🏖️' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'דיווח על היעדרות ליותר מיום אחד' }))

    expect(screen.getByLabelText('עד תאריך')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'דיווח על היעדרות ליותר מיום אחד' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'חזרה ליום אחד' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'חזרה ליום אחד' }))

    expect(screen.queryByLabelText('עד תאריך')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'דיווח על היעדרות ליותר מיום אחד' })).toBeInTheDocument()
  })

  it('sends a single-day endDate after collapsing back from a filled range', async () => {
    signIn()
    const fetchMock = mockFetch((url, init) => {
      if (String(url).includes('/absences') && init?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: {
            id: 'a3',
            userId: 'u1',
            type: 'VACATION',
            startDate: '2026-08-13',
            endDate: '2026-08-13',
            halfDay: false,
            workingDayCount: 1,
          },
        }
      }
      return { ok: true, status: 200, json: options }
    })
    const user = userEvent.setup()

    renderScreen()
    await user.click(await screen.findByRole('tab', { name: 'דיווח העדרות' }))
    await user.selectOptions(screen.getByLabelText('סוג היעדרות'), 'VACATION_FULL')
    await user.click(screen.getByRole('button', { name: 'דיווח על היעדרות ליותר מיום אחד' }))
    fireEvent.change(screen.getByLabelText('מתאריך'), { target: { value: '2026-08-13' } })
    fireEvent.change(screen.getByLabelText('עד תאריך'), { target: { value: '2026-08-16' } })
    await user.click(screen.getByRole('button', { name: 'חזרה ליום אחד' }))
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => String(url).includes('/absences') && (init as RequestInit).method === 'POST',
        ),
      ).toBe(true)
    })
    const call = fetchMock.mock.calls.find(
      ([url, init]) => String(url).includes('/absences') && (init as RequestInit).method === 'POST',
    )
    expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
      type: 'VACATION',
      startDate: '2026-08-13',
      endDate: '2026-08-13',
      halfDay: false,
    })
  })

  it('posts a single-day absence with endDate equal to startDate when the more-days link is not used', async () => {
    signIn()
    const fetchMock = mockFetch((url, init) => {
      if (String(url).includes('/absences') && init?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: {
            id: 'a2',
            userId: 'u1',
            type: 'SICK',
            startDate: '2026-08-13',
            endDate: '2026-08-13',
            halfDay: false,
            workingDayCount: 1,
          },
        }
      }
      return { ok: true, status: 200, json: options }
    })
    const user = userEvent.setup()
    const onClose = vi.fn()

    renderScreen(onClose)
    await user.click(await screen.findByRole('tab', { name: 'דיווח העדרות' }))
    await user.selectOptions(screen.getByLabelText('סוג היעדרות'), 'SICK')
    fireEvent.change(screen.getByLabelText('מתאריך'), { target: { value: '2026-08-13' } })
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const call = fetchMock.mock.calls.find(([url, init]) => String(url).includes('/absences') && (init as RequestInit).method === 'POST')
    expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
      type: 'SICK',
      startDate: '2026-08-13',
      endDate: '2026-08-13',
      halfDay: false,
    })
  })

  it('pre-fills a saved single-day absence and keeps the more-days link', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen(vi.fn(), {
      initialDate: '2026-08-12',
      initialAbsences: [
        {
          id: 'abs-9',
          userId: 'u1',
          type: 'SICK',
          startDate: '2026-08-12',
          endDate: '2026-08-12',
          halfDay: false,
          workingDayCount: 1,
          attachments: [],
        },
      ],
    })

    await user.click(await screen.findByRole('tab', { name: 'דיווח העדרות' }))

    expect(screen.getByLabelText('סוג היעדרות')).toHaveValue('SICK')
    expect(screen.getByLabelText('מתאריך')).toHaveValue('2026-08-12')
    expect(screen.queryByLabelText('עד תאריך')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'דיווח על היעדרות ליותר מיום אחד' })).toBeInTheDocument()
  })

  it('pre-fills a saved multi-day absence with the range already expanded', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    const user = userEvent.setup()

    renderScreen(vi.fn(), {
      initialDate: '2026-08-14',
      initialAbsences: [
        {
          id: 'abs-10',
          userId: 'u1',
          type: 'VACATION',
          startDate: '2026-08-13',
          endDate: '2026-08-16',
          halfDay: false,
          workingDayCount: 2,
          attachments: [],
        },
      ],
    })

    await user.click(await screen.findByRole('tab', { name: 'דיווח העדרות' }))

    expect(screen.getByLabelText('מתאריך')).toHaveValue('2026-08-13')
    expect(screen.getByLabelText('עד תאריך')).toHaveValue('2026-08-16')
    expect(screen.queryByRole('button', { name: 'דיווח על היעדרות ליותר מיום אחד' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'חזרה ליום אחד' })).toBeInTheDocument()
  })

  it('updates an existing absence via PATCH instead of creating a new one', async () => {
    signIn()
    const fetchMock = mockFetch((url, init) => {
      if (String(url).includes('/absences/abs-11') && init?.method === 'PATCH') {
        return {
          ok: true,
          status: 200,
          json: {
            id: 'abs-11',
            userId: 'u1',
            type: 'VACATION',
            startDate: '2026-08-12',
            endDate: '2026-08-12',
            halfDay: false,
            workingDayCount: 1,
            attachments: [],
          },
        }
      }
      return { ok: true, status: 200, json: options }
    })
    const user = userEvent.setup()
    const onClose = vi.fn()

    renderScreen(onClose, {
      initialDate: '2026-08-12',
      initialAbsences: [
        {
          id: 'abs-11',
          userId: 'u1',
          type: 'SICK',
          startDate: '2026-08-12',
          endDate: '2026-08-12',
          halfDay: false,
          workingDayCount: 1,
          attachments: [],
        },
      ],
    })

    await user.click(await screen.findByRole('tab', { name: 'דיווח העדרות' }))
    await user.selectOptions(screen.getByLabelText('סוג היעדרות'), 'VACATION_FULL')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => String(url).includes('/absences') && (init as RequestInit).method === 'POST',
      ),
    ).toBe(false)
    const call = fetchMock.mock.calls.find(
      ([url, init]) => String(url).includes('/absences/abs-11') && (init as RequestInit).method === 'PATCH',
    )
    expect(call).toBeDefined()
    expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
      type: 'VACATION',
      startDate: '2026-08-12',
      endDate: '2026-08-12',
      halfDay: false,
      attachmentIds: [],
    })
  })

  it('does not fetch when absence type is missing, and shows conflict dates from 409', async () => {
    signIn()
    const fetchMock = mockFetch((url, init) => {
      if (String(url).includes('/absences') && init?.method === 'POST') {
        return {
          ok: false,
          status: 409,
          json: {
            error: {
              code: 'CONFLICT',
              message: 'Absence conflicts with existing records',
              details: [{ field: '2026-08-13', message: 'OVERLAPPING_ABSENCE' }],
            },
          },
        }
      }
      return { ok: true, status: 200, json: options }
    })
    const user = userEvent.setup()

    renderScreen()
    await user.click(await screen.findByRole('tab', { name: 'דיווח העדרות' }))
    await user.click(screen.getByRole('button', { name: 'דיווח על היעדרות ליותר מיום אחד' }))
    fireEvent.change(screen.getByLabelText('מתאריך'), { target: { value: '2026-08-13' } })
    fireEvent.change(screen.getByLabelText('עד תאריך'), { target: { value: '2026-08-16' } })
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(screen.getByText('יש לבחור סוג היעדרות')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).includes('/absences') && (init as RequestInit).method === 'POST')).toBe(
      false,
    )

    await user.selectOptions(screen.getByLabelText('סוג היעדרות'), 'VACATION_FULL')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('2026-08-13')
    expect(screen.getByRole('alert')).toHaveTextContent('התאריכים מתנגשים עם דיווח קיים')
  })

  it('hides the absence tab when an admin is editing another employee', async () => {
    signIn()
    mockFetch(() => ({ ok: true, status: 200, json: options }))
    renderScreen(vi.fn(), { allowAbsenceTab: false })

    expect(await screen.findByRole('button', { name: 'הוספת פרויקט' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'דיווח העדרות' })).not.toBeInTheDocument()
  })
})
