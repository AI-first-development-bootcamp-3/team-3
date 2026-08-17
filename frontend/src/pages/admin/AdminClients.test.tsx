import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminClients from './AdminClients'

function renderWithQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminClients />
    </QueryClientProvider>,
  )
}

function mockFetchSequence(responses: Array<{ ok: boolean; status: number; json: unknown }>) {
  const fetchMock = vi.fn()
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: response.ok,
      status: response.status,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => response.json,
    })
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const activeClient = { id: '1', name: 'Acme', contactDetails: 'ops@acme.test', isActive: true }
const inactiveClient = { id: '2', name: 'Globex', contactDetails: null, isActive: false }

describe('AdminClients', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the client list once loaded', async () => {
    mockFetchSequence([{ ok: true, status: 200, json: { clients: [activeClient, inactiveClient] } }])

    renderWithQueryClient()

    expect(await screen.findByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Globex')).toBeInTheDocument()
    expect(screen.getByText('פעיל')).toBeInTheDocument()
    expect(screen.getByText('לא פעיל')).toBeInTheDocument()
  })

  it('creates a new client and refreshes the list', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, status: 200, json: { clients: [] } },
      { ok: true, status: 201, json: { client: activeClient } },
      { ok: true, status: 200, json: { clients: [activeClient] } },
    ])
    const user = userEvent.setup()

    renderWithQueryClient()

    await user.click(await screen.findByRole('button', { name: 'לקוח חדש' }))
    await user.type(screen.getByLabelText('Name'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'יצירה' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/clients'),
        expect.objectContaining({ method: 'POST' }),
      )
    })
    expect(await screen.findByText('Acme')).toBeInTheDocument()
  })

  it('deactivating a client from the edit form requires confirmation before it takes effect', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, status: 200, json: { clients: [activeClient] } },
      { ok: true, status: 200, json: { client: { ...activeClient, isActive: false } } },
    ])
    const user = userEvent.setup()

    renderWithQueryClient()

    await user.click(await screen.findByRole('button', { name: 'עריכה' }))

    const toggle = screen.getByRole('switch')
    expect(toggle).toBeChecked()

    await user.click(toggle)
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/admin/clients/1'), expect.anything())

    await user.click(screen.getByRole('button', { name: 'השבת' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/clients/1'),
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ isActive: false }) }),
      )
    })
  })
})
