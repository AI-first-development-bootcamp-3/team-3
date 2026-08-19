import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminEmployeeReports from './AdminEmployeeReports'

const users = [
  {
    id: 'u-emp',
    email: 'gal@abra.test',
    displayName: 'גל ישראלי',
    role: 'EMPLOYEE',
    isActive: true,
    mustChangePassword: false,
  },
]

const report = {
  id: 'r1',
  userId: 'u-emp',
  clientId: 'client-1',
  projectId: 'project-1',
  taskId: 'task-1',
  date: '2026-08-16',
  workLocation: 'OFFICE',
  startTime: '09:00',
  endTime: '18:00',
  hours: 9,
  description: 'Original',
  clientName: 'Acme',
  projectName: 'Website',
  taskName: 'Design',
  durationHours: 9,
}

const audits = [
  {
    id: 'a1',
    employeeId: 'u-emp',
    actorId: 'u-admin',
    actorName: 'דנה מנהלת',
    date: '2026-08-16',
    action: 'REPLACED' as const,
    previousJson: [
      {
        clientId: 'client-1',
        projectId: 'project-1',
        taskId: 'task-1',
        workLocation: 'OFFICE',
        hours: 9,
        description: 'Original',
        startTime: '09:00',
        endTime: '18:00',
      },
    ],
    nextJson: [
      {
        clientId: 'client-1',
        projectId: 'project-1',
        taskId: 'task-2',
        workLocation: 'HOME',
        hours: 8,
        description: 'Fixed',
        startTime: '09:00',
        endTime: '18:00',
      },
      {
        clientId: 'client-1',
        projectId: 'project-2',
        taskId: 'task-3',
        workLocation: 'OFFICE',
        hours: 1,
        description: 'New',
        startTime: '09:00',
        endTime: '18:00',
      },
    ],
    reason: null,
    createdAt: '2026-08-16T12:00:00.000Z',
  },
]

const options = {
  clients: [
    {
      id: 'client-1',
      name: 'Acme',
      projects: [
        {
          id: 'project-1',
          name: 'Website',
          reportFormat: 'SUM_HOURS',
          tasks: [{ id: 'task-1', name: 'Design' }],
        },
      ],
    },
  ],
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(status === 204 ? undefined : { 'content-type': 'application/json' }),
    json: async () => body,
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <App>
        <AdminEmployeeReports />
      </App>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AdminEmployeeReports', () => {
  it('loads an employee month, opens a day, and saves through the admin batch API', async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url)
      if (href.includes('/admin/users')) return jsonResponse({ users })
      if (href.includes('/admin/reports/options')) return jsonResponse(options)
      if (href.includes('/admin/reports/audit')) return jsonResponse({ audits: [] })
      if (href.includes('/admin/reports/batch') && init?.method === 'POST') {
        return jsonResponse({ reports: [{ ...report, hours: 9, description: 'Original' }] }, 201)
      }
      if (href.includes('/admin/reports?')) return jsonResponse({ reports: [report] })
      return jsonResponse({ error: { message: 'unexpected' } }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: 'דיווחי עובדים' })).toBeInTheDocument()
    await screen.findByRole('option', { name: 'גל ישראלי' })
    await user.selectOptions(screen.getByLabelText('עובד'), 'u-emp')

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([callUrl]) => String(callUrl).includes('/admin/reports?') && String(callUrl).includes('userId=u-emp'))).toBe(
        true,
      )
    })

    expect(await screen.findByText('Website')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'עריכה' }))

    expect(await screen.findByLabelText('פרויקט 1')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'דיווח העדרות' })).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'הוספת פרויקט' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      const batch = fetchMock.mock.calls.find(
        ([callUrl, callInit]) => String(callUrl).includes('/admin/reports/batch') && callInit?.method === 'POST',
      )
      expect(batch).toBeTruthy()
      expect(JSON.parse(String(batch?.[1]?.body))).toEqual(
        expect.objectContaining({
          userId: 'u-emp',
          date: '2026-08-16',
          rows: [expect.objectContaining({ taskId: 'task-1', hours: 9 })],
        }),
      )
    })
  })

  it('shows specific audit change pills and hides the overflow behind +N', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const href = String(url)
        if (href.includes('/admin/users')) return jsonResponse({ users })
        if (href.includes('/admin/reports/audit')) return jsonResponse({ audits })
        if (href.includes('/admin/reports?')) return jsonResponse({ reports: [report] })
        return jsonResponse({ error: { message: 'unexpected' } }, 500)
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('option', { name: 'גל ישראלי' })
    await user.selectOptions(screen.getByLabelText('עובד'), 'u-emp')

    expect(await screen.findByLabelText('הוספת פרויקט · שינוי משימה · שינוי מיקום · שינוי שעות · שינוי פירוט')).toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
    expect(screen.getAllByText('הוספת פרויקט').length).toBeGreaterThan(0)
    expect(screen.getAllByText('שינוי משימה').length).toBeGreaterThan(0)

    await user.hover(screen.getByLabelText('עוד 3 פעולות'))
    const tooltip = await screen.findByRole('tooltip')
    expect(within(tooltip).getByText('שינוי מיקום')).toBeInTheDocument()
    expect(within(tooltip).getByText('שינוי שעות')).toBeInTheDocument()
    expect(within(tooltip).getByText('שינוי פירוט')).toBeInTheDocument()
  })
})
