import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './apiClient'
import { sessionStore } from './sessionStore'

function mockFetchOnce(response: {
  ok: boolean
  status: number
  json?: unknown
}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => response.json,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.getState().clearSession()
})

describe('apiClient request', () => {
  it('returns the parsed JSON body on a successful response', async () => {
    mockFetchOnce({ ok: true, status: 200, json: { id: '1', name: 'Acme' } })

    const result = await request<{ id: string; name: string }>('/clients/1')

    expect(result).toEqual({ id: '1', name: 'Acme' })
  })

  it('throws ApiError with the status and parsed body on a non-2xx response', async () => {
    mockFetchOnce({
      ok: false,
      status: 404,
      json: { message: 'Not found' },
    })

    await expect(request('/clients/missing')).rejects.toMatchObject({
      status: 404,
      body: { message: 'Not found' },
    })
    await expect(request('/clients/missing')).rejects.toBeInstanceOf(ApiError)
  })

  it('attaches the session token when one is set', async () => {
    sessionStore
      .getState()
      .setSession({ id: '1', fullName: 'Dan', email: 'd@x.com', userType: 'admin', active: true }, 'abc123')
    const fetchMock = mockFetchOnce({ ok: true, status: 200, json: {} })

    await request('/protected')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBe('Bearer abc123')
  })

  it('omits the Authorization header when no token is set', async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, json: {} })

    await request('/public')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBeUndefined()
  })
})
