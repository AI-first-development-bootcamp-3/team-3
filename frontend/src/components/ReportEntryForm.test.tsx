import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App, ConfigProvider } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ReportEntryForm from './ReportEntryForm'
import { sessionStore } from '../services/sessionStore'

const options = {
  clients: [
    {
      id: 'client-1',
      name: 'Acme',
      projects: [{ id: 'project-1', name: 'Website', tasks: [{ id: 'task-1', name: 'Design' }] }],
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

function renderForm() {
  return render(
    <ConfigProvider>
      <App>
        <ReportEntryForm />
      </App>
    </ConfigProvider>,
  )
}

describe('ReportEntryForm', { timeout: 15_000 }, () => {
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

  it('posts a report and resets the description after success', async () => {
    signIn()
    const fetchMock = mockFetch((url, init) => {
      if (url.includes('/me/reporting-options')) {
        return { ok: true, status: 200, json: options }
      }
      if (init?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: {
            id: 'r1',
            userId: 'u1',
            clientId: 'client-1',
            projectId: 'project-1',
            taskId: 'task-1',
            date: '2026-08-16',
            workLocation: 'OFFICE',
            startTime: '09:00',
            endTime: '18:00',
            description: 'עבודה',
          },
        }
      }
      return { ok: false, status: 500, json: {} }
    })
    const user = userEvent.setup()
    renderForm()

    expect(await screen.findByLabelText('פירוט')).toBeInTheDocument()
    await user.click(screen.getByLabelText('מיקום'))
    await user.click(await screen.findByText('משרד'))
    await user.type(screen.getByLabelText('פירוט'), 'עבודה')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === 'POST')
      expect(post).toBeTruthy()
    })

    await waitFor(() => {
      expect(screen.getByLabelText('פירוט')).toHaveValue('')
    })
  })

  it('shows a server field error on 400', async () => {
    signIn()
    mockFetch((url, init) => {
      if (url.includes('/me/reporting-options')) {
        return { ok: true, status: 200, json: options }
      }
      if (init?.method === 'POST') {
        return {
          ok: false,
          status: 400,
          json: {
            error: {
              code: 'BAD_REQUEST',
              message: 'Request validation failed',
              details: [{ field: 'description', message: 'Description is required' }],
            },
          },
        }
      }
      return { ok: false, status: 500, json: {} }
    })
    const user = userEvent.setup()
    renderForm()

    await screen.findByLabelText('פירוט')
    await user.click(screen.getByLabelText('מיקום'))
    await user.click(await screen.findByText('משרד'))
    await user.type(screen.getByLabelText('פירוט'), 'עבודה')
    await user.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(await screen.findByText('Description is required')).toBeInTheDocument()
  })
})
