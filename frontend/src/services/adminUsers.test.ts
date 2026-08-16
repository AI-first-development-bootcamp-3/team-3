import { afterEach, describe, expect, it, vi } from 'vitest'
import { createUser, type CreateUserRequest } from './adminUsers'
import { sessionStore } from './sessionStore'

function mockFetchOnce(response: { ok: boolean; status: number; json: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => response.json,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('adminUsers createUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStore.getState().clearSession()
  })

  it('POSTs to /admin/users with the given input and returns the parsed response', async () => {
    const input: CreateUserRequest = {
      email: 'new@abra.test',
      displayName: 'New Person',
      role: 'EMPLOYEE',
    }
    const responseBody = {
      user: { id: '1', email: 'new@abra.test', displayName: 'New Person', role: 'EMPLOYEE', isActive: true, mustChangePassword: true },
      temporaryPassword: 'generated-temp-pw',
    }
    const fetchMock = mockFetchOnce({ ok: true, status: 201, json: responseBody })

    const result = await createUser(input)

    expect(result).toEqual(responseBody)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/admin/users')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(input)
  })

  it('rejects with an ApiError on a non-2xx response', async () => {
    mockFetchOnce({ ok: false, status: 409, json: { error: { code: 'CONFLICT', message: 'A user with this email already exists' } } })

    await expect(
      createUser({ email: 'taken@abra.test', displayName: 'Existing', role: 'EMPLOYEE' }),
    ).rejects.toMatchObject({ status: 409 })
  })
})
