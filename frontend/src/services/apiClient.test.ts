import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './apiClient'

function mockFetchOnce(response: {
  ok: boolean
  status: number
  json?: unknown
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => response.json,
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
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
})
