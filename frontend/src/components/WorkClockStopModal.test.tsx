import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App, ConfigProvider } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WorkClockStopModal from './WorkClockStopModal'
import type { ClockSession } from '../types/clock'

const session: ClockSession = {
  sessionId: 's1',
  status: 'AWAITING_CONFIRM',
  startedAt: '2026-08-17T06:00:00.000Z',
  stoppedAt: '2026-08-17T15:00:00.000Z',
  autoStopped: false,
  segments: [
    {
      date: '2026-08-17',
      startTime: '09:00',
      endTime: '18:00',
      durationMinutes: 540,
    },
  ],
}

const options = {
  clients: [
    {
      id: 'client-1',
      name: 'Acme',
      projects: [{ id: 'project-1', name: 'Website', tasks: [{ id: 'task-1', name: 'Design' }] }],
    },
  ],
}

function jsonOk(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  })
}

function stubClockApis(reporting = options) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.includes('/me/reporting-options')) return jsonOk(reporting)
    if (method === 'POST' && url.includes('/reports')) {
      return jsonOk({ id: 'r-new' }, 201)
    }
    if (method === 'POST' && url.includes('/me/clock/complete')) {
      return Promise.resolve({ ok: true, status: 204, headers: new Headers(), json: async () => undefined })
    }
    return Promise.reject(new Error(`Unhandled fetch: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderModal(overrides: Partial<Parameters<typeof WorkClockStopModal>[0]> = {}) {
  const onCancel = vi.fn()
  const onConfirmed = vi.fn()
  render(
    <ConfigProvider direction="rtl">
      <App>
        <WorkClockStopModal
          open
          session={session}
          onCancel={onCancel}
          onConfirmed={onConfirmed}
          {...overrides}
        />
      </App>
    </ConfigProvider>,
  )
  return { onCancel, onConfirmed }
}

async function pickHierarchy(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('combobox', { name: 'פרויקט' }))
  await user.click(await screen.findByText('Website'))
  await user.click(screen.getByRole('combobox', { name: 'משימה' }))
  await user.click(await screen.findByText('Design'))
  await user.click(screen.getByRole('combobox', { name: 'מיקום' }))
  await user.click(await screen.findByText('משרד'))
}

describe('WorkClockStopModal', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('uses dropdowns for project, task, and location before enabling confirm', async () => {
    stubClockApis()
    const user = userEvent.setup()
    const { onConfirmed } = renderModal()

    const confirm = screen.getByRole('button', { name: 'שמירת דיווח' })
    expect(confirm).toBeDisabled()

    await pickHierarchy(user)

    expect(confirm).toBeEnabled()
    await user.click(confirm)
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled())
  })

  it('saves without a description and posts zero hours for a sub-minute session', async () => {
    const fetchMock = stubClockApis()
    const user = userEvent.setup()
    const { onConfirmed } = renderModal({
      session: {
        ...session,
        segments: [{ date: '2026-08-18', startTime: '16:02', endTime: '16:02', durationMinutes: 0 }],
      },
    })

    expect(await screen.findByText('פחות מדקה')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('הוספת פירוט...')).toBeInTheDocument()

    await pickHierarchy(user)
    await user.click(screen.getByRole('button', { name: 'שמירת דיווח' }))
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled())

    const reportCall = fetchMock.mock.calls.find(
      ([input, init]) => String(input).includes('/reports') && (init as RequestInit | undefined)?.method === 'POST',
    )
    expect(reportCall).toBeDefined()
    const body = JSON.parse(String((reportCall?.[1] as RequestInit).body))
    expect(body).toMatchObject({
      date: '2026-08-18',
      startTime: '16:02',
      endTime: '16:02',
      hours: 0,
      description: '',
      workLocation: 'OFFICE',
      taskId: 'task-1',
    })
  })

  it('posts one report per midnight-split segment', async () => {
    const fetchMock = stubClockApis()
    const user = userEvent.setup()
    renderModal({
      session: {
        ...session,
        segments: [
          { date: '2026-08-17', startTime: '23:50', endTime: '23:59', durationMinutes: 9 },
          { date: '2026-08-18', startTime: '00:00', endTime: '00:10', durationMinutes: 10 },
        ],
      },
    })

    await pickHierarchy(user)
    await user.click(screen.getByRole('button', { name: 'שמירת דיווח' }))
    await waitFor(() => {
      const reportPosts = fetchMock.mock.calls.filter(
        ([input, init]) => String(input).includes('/reports') && (init as RequestInit | undefined)?.method === 'POST',
      )
      expect(reportPosts).toHaveLength(2)
    })
  })

  it('keeps confirm disabled and explains when no tasks are assigned', async () => {
    stubClockApis({ clients: [] })
    renderModal()

    expect(await screen.findByText(/אין משימות מוקצות/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'שמירת דיווח' })).toBeDisabled()
    expect(screen.queryByRole('combobox', { name: 'פרויקט' })).not.toBeInTheDocument()
  })

  it('shows the auto-stop notice after EOD', async () => {
    stubClockApis()
    renderModal({ session: { ...session, autoStopped: true } })

    expect(await screen.findByText(/נעצר אוטומטית/)).toBeInTheDocument()
  })

  it('discards without saving when the employee cancels', async () => {
    stubClockApis()
    const user = userEvent.setup()
    const { onCancel, onConfirmed } = renderModal()

    await user.click(await screen.findByRole('button', { name: 'ביטול ללא שמירה' }))
    expect(onCancel).toHaveBeenCalled()
    expect(onConfirmed).not.toHaveBeenCalled()
  })
})
