import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminHourSettings from './AdminHourSettings'

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  }
}

    const projects = [
  {
    id: 'p1',
    name: 'Cargo',
    isActive: true,
    reportFormat: 'CLOCK_IN_OUT',
    clientId: 'c1',
    clientName: 'EL-AL',
    managerId: null,
    managerName: null,
    startDate: null,
    endDate: null,
    description: '',
  },
  {
    id: 'p2',
    name: 'Wellness Program',
    isActive: true,
    reportFormat: 'SUM_HOURS',
    clientId: 'c2',
    clientName: 'Clalit',
    managerId: null,
    managerName: null,
    startDate: null,
    endDate: null,
    description: '',
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminHourSettings />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AdminHourSettings', () => {
  it('lists projects with report-type radios', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ projects })),
    )
    renderPage()

    expect(screen.getByRole('heading', { name: 'הגדרת דיווחי שעות' })).toBeInTheDocument()
    expect(await screen.findByText('Cargo')).toBeInTheDocument()
    expect(screen.getAllByLabelText('כניסה/יציאה').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('סיכום שעות').length).toBeGreaterThan(0)
  })

  it('filters by client or project name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ projects })))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cargo')

    await user.type(screen.getByPlaceholderText('חיפוש לפי שם לקוח או פרויקט'), 'Clalit')
    expect(screen.getByText('Wellness Program')).toBeInTheDocument()
    expect(screen.queryByText('Cargo')).not.toBeInTheDocument()
  })

  it('PATCHes report format when a radio changes', async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (String(url).includes('/admin/projects/') && init?.method === 'PATCH') {
        return jsonResponse({
          project: { ...projects[0], reportFormat: 'SUM_HOURS' },
        })
      }
      return jsonResponse({ projects })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Cargo')

    const summaryRadios = screen.getAllByLabelText('סיכום שעות')
    await user.click(summaryRadios[0]!)

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/admin/projects/p1') && call[1]?.method === 'PATCH')).toBe(
        true,
      )
    })
  })
})
