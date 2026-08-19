import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminAssignments from './AdminAssignments'
import type { AdminAssignmentRow } from '../../services/adminAssignments'
import type { AdminClient } from '../../services/adminClients'
import type { AdminProject } from '../../services/adminProjects'
import type { AdminUser } from '../../services/adminUsers'

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  }
}

function emptyResponse(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => undefined,
  }
}

const workers = [
  { userId: 'w1', displayName: 'יואב ישראלי בכר' },
  { userId: 'w2', displayName: 'אריאל מזרחי' },
  { userId: 'w3', displayName: 'גבריאל רון' },
  { userId: 'w4', displayName: 'לי כהן' },
  { userId: 'w5', displayName: 'רז לוי' },
  { userId: 'w6', displayName: 'שירי כהן נפטלי' },
]

function defaultAssignments(): AdminAssignmentRow[] {
  return [
    {
      taskId: 't-cargo-dev',
      taskName: 'פיתוח',
      projectId: 'p-cargo',
      projectName: 'Cargo',
      clientId: 'c-elal',
      clientName: 'EL-AL',
      workers,
    },
    {
      taskId: 't-crew',
      taskName: 'פיתוח',
      projectId: 'p-crew',
      projectName: 'Crew-hub',
      clientId: 'c-elal',
      clientName: 'EL-AL',
      workers: [{ userId: 'w7', displayName: 'מארק לוי' }],
    },
    {
      taskId: 't-force-design',
      taskName: 'עיצוב',
      projectId: 'p-force',
      projectName: 'Force System',
      clientId: 'c-one',
      clientName: 'ONE',
      workers: [{ userId: 'w3', displayName: 'גבריאל רון' }],
    },
  ]
}

function defaultClients(): AdminClient[] {
  return [
    { id: 'c-elal', name: 'EL-AL', contactDetails: null, isActive: true },
    { id: 'c-one', name: 'ONE', contactDetails: null, isActive: true },
  ]
}

function extraProjectFields() {
  return {
    managerId: null as string | null,
    managerName: null as string | null,
    startDate: null as string | null,
    endDate: null as string | null,
    description: '',
  }
}

function defaultProjects(): AdminProject[] {
  return [
    {
      id: 'p-cargo',
      name: 'Cargo',
      isActive: true,
      reportFormat: 'CLOCK_IN_OUT',
      clientId: 'c-elal',
      clientName: 'EL-AL',
      ...extraProjectFields(),
    },
    {
      id: 'p-crew',
      name: 'Crew-hub',
      isActive: true,
      reportFormat: 'CLOCK_IN_OUT',
      clientId: 'c-elal',
      clientName: 'EL-AL',
      ...extraProjectFields(),
    },
    {
      id: 'p-force',
      name: 'Force System',
      isActive: true,
      reportFormat: 'SUM_HOURS',
      clientId: 'c-one',
      clientName: 'ONE',
      ...extraProjectFields(),
    },
  ]
}

function defaultUsers(): AdminUser[] {
  return [
    {
      id: 'u-aviel',
      email: 'aviel@abra.test',
      displayName: 'אביאל שרון',
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: 'w6',
      email: 'shiri@abra.test',
      displayName: 'שירי כהן נפטלי',
      role: 'EMPLOYEE',
      isActive: true,
      mustChangePassword: false,
    },
  ]
}

function stubAdminApi() {
  const store = {
    assignments: defaultAssignments(),
    clients: defaultClients(),
    projects: defaultProjects(),
    users: defaultUsers(),
  }

  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const path = String(url)
    const method = init?.method ?? 'GET'
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}

    if (path.includes('/admin/assignments') && method === 'GET') {
      return jsonResponse({
        assignments: store.assignments.map((row) => ({
          ...row,
          workers: row.workers.map((worker) => ({ ...worker })),
        })),
      })
    }
    if (path.includes('/admin/assignments') && method === 'POST') {
      const taskId = String(body.taskId)
      const userIds = body.userIds as string[]
      const row = store.assignments.find((item) => item.taskId === taskId)
      if (row) {
        for (const userId of userIds) {
          const user = store.users.find((item) => item.id === userId)
          if (user && !row.workers.some((worker) => worker.userId === userId)) {
            row.workers.push({ userId, displayName: user.displayName })
          }
        }
        return jsonResponse({ assignment: row }, 201)
      }
      return jsonResponse({ error: { code: 'NOT_FOUND' } }, 404)
    }
    if (path.includes('/admin/clients') && method === 'GET' && !path.includes('/admin/clients/')) {
      return jsonResponse({ clients: store.clients.map((client) => ({ ...client })) })
    }
    if (path.includes('/admin/clients') && method === 'POST') {
      const client = {
        id: `c-${crypto.randomUUID()}`,
        name: String(body.name),
        contactDetails: (body.contactDetails as string | undefined) ?? null,
        isActive: true,
      }
      store.clients.push(client)
      return jsonResponse({ client }, 201)
    }
    if (path.includes('/admin/clients/') && method === 'PATCH') {
      const id = path.split('/admin/clients/')[1]?.split('?')[0] ?? ''
      const client = store.clients.find((item) => item.id === id)
      if (!client) return jsonResponse({ error: { code: 'NOT_FOUND' } }, 404)
      if (typeof body.name === 'string') client.name = body.name
      if (typeof body.isActive === 'boolean') {
        client.isActive = body.isActive
        if (!body.isActive) store.assignments = store.assignments.filter((row) => row.clientId !== id)
      }
      return jsonResponse({ client })
    }
    if (path.includes('/admin/projects') && method === 'GET' && !path.includes('/admin/projects/')) {
      return jsonResponse({ projects: store.projects.map((project) => ({ ...project })) })
    }
    if (path.includes('/admin/projects') && method === 'POST') {
      const client = store.clients.find((item) => item.id === body.clientId)
      const project: AdminProject = {
        id: `p-${crypto.randomUUID()}`,
        name: String(body.name),
        isActive: true,
        reportFormat: 'CLOCK_IN_OUT',
        clientId: String(body.clientId),
        clientName: client?.name ?? '',
        managerId: String(body.managerId),
        managerName: store.users.find((user) => user.id === body.managerId)?.displayName ?? null,
        startDate: String(body.startDate),
        endDate: String(body.endDate),
        description: String(body.description ?? ''),
      }
      store.projects.push(project)
      return jsonResponse({ project }, 201)
    }
    if (path.includes('/admin/projects/') && method === 'PATCH') {
      const id = path.split('/admin/projects/')[1]?.split('?')[0] ?? ''
      const project = store.projects.find((item) => item.id === id)
      if (!project) return jsonResponse({ error: { code: 'NOT_FOUND' } }, 404)
      if (typeof body.name === 'string') {
        project.name = body.name
        for (const row of store.assignments) {
          if (row.projectId === id) row.projectName = body.name
        }
      }
      if (typeof body.isActive === 'boolean') {
        project.isActive = body.isActive
        if (!body.isActive) store.assignments = store.assignments.filter((row) => row.projectId !== id)
      }
      return jsonResponse({ project })
    }
    if (path.includes('/admin/tasks') && method === 'POST') {
      const project = store.projects.find((item) => item.id === body.projectId)
      const row: AdminAssignmentRow = {
        taskId: `t-${crypto.randomUUID()}`,
        taskName: String(body.name),
        projectId: String(body.projectId),
        projectName: project?.name ?? '',
        clientId: project?.clientId ?? '',
        clientName: project?.clientName ?? '',
        workers: [],
      }
      store.assignments.unshift(row)
      return jsonResponse({ task: { id: row.taskId, name: row.taskName } }, 201)
    }
    if (path.includes('/admin/tasks/') && method === 'PATCH') {
      const id = path.split('/admin/tasks/')[1]?.split('?')[0] ?? ''
      const row = store.assignments.find((item) => item.taskId === id)
      if (!row) return jsonResponse({ error: { code: 'NOT_FOUND' } }, 404)
      if (typeof body.name === 'string') row.taskName = body.name
      if (body.status === 'CLOSED') store.assignments = store.assignments.filter((item) => item.taskId !== id)
      return jsonResponse({ task: { id, name: row.taskName, status: body.status ?? 'OPEN' } })
    }
    if (path.includes('/admin/users') && method === 'GET') {
      return jsonResponse({ users: store.users.map((user) => ({ ...user })) })
    }
    return emptyResponse(404)
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminAssignments />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AdminAssignments', () => {
  it('renders the Figma table columns and assignment rows', async () => {
    stubAdminApi()
    renderPage()

    expect(screen.getByRole('heading', { name: 'שיוך עובד למשימה' })).toBeInTheDocument()
    expect(await screen.findByText('Cargo')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'שם לקוח' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'שם פרויקט' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'שם המשימה' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'שמות העובדים המשוייכים' })).toBeInTheDocument()
    expect(screen.getAllByText('EL-AL').length).toBeGreaterThan(0)
    expect(screen.getAllByText('+3').length).toBeGreaterThan(0)
  })

  it('shows every assigned name when hovering the +N pill', async () => {
    stubAdminApi()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cargo')

    const overflow = screen.getByLabelText(/כל העובדים/)
    await user.hover(overflow)
    const tooltip = await screen.findByRole('tooltip')
    expect(within(tooltip).getByText('שירי כהן נפטלי')).toBeInTheDocument()
    expect(within(tooltip).getByText('יואב ישראלי בכר')).toBeInTheDocument()
    expect(within(tooltip).getByText('רז לוי')).toBeInTheDocument()
  })

  it('filters rows by employee name', async () => {
    stubAdminApi()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cargo')

    await user.type(screen.getByPlaceholderText('חיפוש לפי שם עובד'), 'שירי')

    expect(screen.getByText('Cargo')).toBeInTheDocument()
    expect(screen.queryByText('Crew-hub')).not.toBeInTheDocument()
  })

  it('opens the create menu from יצירה', async () => {
    stubAdminApi()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cargo')

    await user.click(screen.getByRole('button', { name: 'יצירה' }))
    expect(screen.getByRole('menuitem', { name: 'צור לקוח חדש' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'צור פרויקט חדש' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'צור משימה חדשה' })).toBeInTheDocument()
  })

  it('opens the create-project dialog and POSTs name, client, manager, and dates', async () => {
    const fetchMock = stubAdminApi()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cargo')

    await user.click(screen.getByRole('button', { name: 'יצירה' }))
    await user.click(screen.getByRole('menuitem', { name: 'צור פרויקט חדש' }))
    const dialog = screen.getByRole('dialog', { name: 'יצירת פרויקט' })
    expect(within(dialog).getByText('כאן תיצור את הפרויקט החדש שיופיע במערכת')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'צור פרויקט' })).toBeDisabled()

    await user.type(within(dialog).getByLabelText('שם הפרויקט'), 'Atlas')
    await user.selectOptions(within(dialog).getByLabelText('שם הלקוח'), 'EL-AL')
    await user.selectOptions(within(dialog).getByLabelText('שייך מנהל ראשי לפרויקט'), 'אביאל שרון')
    await user.type(within(dialog).getByLabelText('תאריך התחלה'), '2025-09-20')
    await user.type(within(dialog).getByLabelText('תאריך סיום'), '2026-02-20')
    await user.click(within(dialog).getByRole('button', { name: 'צור פרויקט' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        (entry) => String(entry[0]).includes('/admin/projects') && entry[1]?.method === 'POST',
      )
      expect(call).toBeDefined()
      expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
        name: 'Atlas',
        clientId: 'c-elal',
        managerId: 'u-aviel',
        startDate: '2025-09-20',
        endDate: '2026-02-20',
      })
    })
  })

  it('opens the create-client dialog and POSTs a new client', async () => {
    const fetchMock = stubAdminApi()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cargo')

    await user.click(screen.getByRole('button', { name: 'יצירה' }))
    await user.click(screen.getByRole('menuitem', { name: 'צור לקוח חדש' }))
    expect(screen.getByRole('heading', { name: 'יצירת לקוח' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('שם הלקוח'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'צור לקוח' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/admin/clients') && call[1]?.method === 'POST')).toBe(
        true,
      )
    })
  })

  it('creates a task through the API and shows it in the table', async () => {
    stubAdminApi()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cargo')

    await user.click(screen.getByRole('button', { name: 'יצירה' }))
    await user.click(screen.getByRole('menuitem', { name: 'צור משימה חדשה' }))
    const dialog = screen.getByRole('dialog', { name: 'יצירת משימה' })
    await user.type(within(dialog).getByLabelText('שם המשימה'), 'QA חדש')
    await user.selectOptions(within(dialog).getByLabelText('בחר פרויקט'), 'Cargo')
    await user.click(within(dialog).getByRole('button', { name: 'צור משימה' }))

    expect(await screen.findByText('QA חדש')).toBeInTheDocument()
  })

  it('asks before deleting a task and removes it', async () => {
    stubAdminApi()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cargo')

    await user.click(screen.getByRole('button', { name: 'מחיקה EL-AL Cargo פיתוח' }))
    await user.click(screen.getByRole('menuitem', { name: 'מחק משימה' }))
    expect(screen.getByRole('heading', { name: 'מחיקת משימה' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'מחיקה' }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'מחיקה EL-AL Cargo פיתוח' })).not.toBeInTheDocument()
    })
  })

  it('assigns a pooled employee onto a task', async () => {
    stubAdminApi()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Force System')

    await user.click(screen.getByRole('button', { name: 'עריכה ONE Force System עיצוב' }))
    await user.click(screen.getByRole('menuitem', { name: 'ערוך שיוך עובדים' }))
    await user.click(await screen.findByLabelText('בחירה אביאל שרון'))
    await user.click(screen.getByRole('button', { name: 'שייך עובד למשימה' }))
    expect(await screen.findByText('אביאל שרון')).toBeInTheDocument()
  })

  it('shows an empty message when the search matches nothing', async () => {
    stubAdminApi()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cargo')

    await user.type(screen.getByPlaceholderText('חיפוש לפי שם עובד'), 'zzzz')
    expect(screen.getByText('אין מידע קיים עד כה')).toBeInTheDocument()
  })
})
