import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminUsers from './AdminUsers'

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  }
}

const users = [
  {
    id: 'u1',
    email: 'gal@abra.test',
    displayName: 'גל ישראלי',
    role: 'EMPLOYEE',
    isActive: true,
    mustChangePassword: false,
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <App>
        <AdminUsers />
      </App>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AdminUsers', () => {
  it('lists users from the admin API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ users })))
    renderPage()

    expect(screen.getByRole('heading', { name: 'משתמשים' })).toBeInTheDocument()
    expect(await screen.findByText('גל ישראלי')).toBeInTheDocument()
    expect(screen.getByText('gal@abra.test')).toBeInTheDocument()
  })

  it('deactivates a user', async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (String(url).includes('/admin/users/u1/status') && init?.method === 'PATCH') {
        return jsonResponse({ user: { ...users[0], isActive: false } })
      }
      return jsonResponse({ users })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('גל ישראלי')
    await user.click(screen.getByRole('button', { name: 'השבתה' }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          (call) => String(call[0]).includes('/admin/users/u1/status') && call[1]?.method === 'PATCH',
        ),
      ).toBe(true)
    })
  })
})
