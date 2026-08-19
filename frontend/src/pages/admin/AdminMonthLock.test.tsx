import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminMonthLock from './AdminMonthLock'

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminMonthLock />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AdminMonthLock', () => {
  it('lists months and locks the selected one', async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (init?.method === 'POST' && String(url).includes('/admin/month-locks')) {
        return jsonResponse({ lock: { year: 2026, month: 8, lockedAt: '2026-08-18T00:00:00.000Z', lockedById: 'a1' } }, 201)
      }
      return jsonResponse({ locks: [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: 'נעילת חודש' })).toBeInTheDocument()
    const lockButtons = await screen.findAllByRole('button', { name: 'נעילה' })
    await user.click(lockButtons[7]!)
    const dialog = await screen.findByRole('dialog', { name: /לנעול את חודש/ })
    await user.click(within(dialog).getByRole('button', { name: 'נעילה' }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) => String(call[0]).includes('/admin/month-locks') && call[1]?.method === 'POST'),
      ).toBe(true)
    })
  })
})
