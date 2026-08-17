import { afterEach, describe, expect, it, vi } from 'vitest'
import { notification } from 'antd'
import { ApiError, request } from './apiClient'
import { sessionStore } from './sessionStore'
import * as navigation from './navigation'

function mockFetchOnce(response: {
  ok: boolean
  status: number
  json?: unknown
  headers?: Record<string, string>
}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    headers: new Headers({ 'content-type': 'application/json', ...response.headers }),
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
      .setSession(
        { id: '1', fullName: 'Dan', email: 'd@x.com', userType: 'admin', active: true },
        'abc123',
        new Date(Date.now() + 60_000).toISOString(),
        false,
      )
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

  it('clears session and redirects to login on 401 response', async () => {
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})
    // antd's static notification API renders into its own DOM container outside
    // any tree RTL's cleanup() knows about, using React's async scheduler - that
    // work can outlive this test file's jsdom teardown and throw "window is not
    // defined". Stub it so the test verifies our error-handling behavior without
    // exercising antd's real (and here, irrelevant) rendering.
    const notificationSpy = vi.spyOn(notification, 'warning').mockImplementation(() => '' as unknown as void)
    sessionStore
      .getState()
      .setSession(
        { id: '1', fullName: 'Dan', email: 'd@x.com', userType: 'admin', active: true },
        'abc123',
        new Date(Date.now() + 60_000).toISOString(),
        false,
      )

    mockFetchOnce({ ok: false, status: 401, json: {} })

    await expect(request('/protected')).rejects.toBeInstanceOf(ApiError)

    expect(sessionStore.getState().token).toBeNull()
    expect(redirectSpy).toHaveBeenCalledOnce()
    expect(notificationSpy).toHaveBeenCalledOnce()
    redirectSpy.mockRestore()
    notificationSpy.mockRestore()
  })

  it('shows the "revoked" copy on a 401 whose body error code is SESSION_REVOKED', async () => {
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})
    const notificationSpy = vi.spyOn(notification, 'warning').mockImplementation(() => '' as unknown as void)
    sessionStore
      .getState()
      .setSession(
        { id: '1', fullName: 'Dan', email: 'd@x.com', userType: 'admin', active: true },
        'abc123',
        new Date(Date.now() + 60_000).toISOString(),
        false,
      )

    mockFetchOnce({ ok: false, status: 401, json: { error: { code: 'SESSION_REVOKED', message: 'Session has ended' } } })

    await expect(request('/protected')).rejects.toBeInstanceOf(ApiError)

    expect(notificationSpy).toHaveBeenCalledWith({ message: 'החיבור נותק', description: 'התנתקת מהמערכת' })
    redirectSpy.mockRestore()
    notificationSpy.mockRestore()
  })

  it('shows the "expired" copy on a 401 whose body error code is not SESSION_REVOKED', async () => {
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})
    const notificationSpy = vi.spyOn(notification, 'warning').mockImplementation(() => '' as unknown as void)
    sessionStore
      .getState()
      .setSession(
        { id: '1', fullName: 'Dan', email: 'd@x.com', userType: 'admin', active: true },
        'abc123',
        new Date(Date.now() + 60_000).toISOString(),
        false,
      )

    mockFetchOnce({ ok: false, status: 401, json: { error: { code: 'TOKEN_EXPIRED', message: 'Token expired' } } })

    await expect(request('/protected')).rejects.toBeInstanceOf(ApiError)

    expect(notificationSpy).toHaveBeenCalledWith({ message: 'החיבור פג ונותק', description: 'יש להתחבר שוב' })
    redirectSpy.mockRestore()
    notificationSpy.mockRestore()
  })

  it('shows the "expired" copy on a 401 with no JSON body', async () => {
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})
    const notificationSpy = vi.spyOn(notification, 'warning').mockImplementation(() => '' as unknown as void)
    sessionStore
      .getState()
      .setSession(
        { id: '1', fullName: 'Dan', email: 'd@x.com', userType: 'admin', active: true },
        'abc123',
        new Date(Date.now() + 60_000).toISOString(),
        false,
      )
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: async () => {
        throw new Error('not json')
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(request('/protected')).rejects.toBeInstanceOf(ApiError)

    expect(notificationSpy).toHaveBeenCalledWith({ message: 'החיבור פג ונותק', description: 'יש להתחבר שוב' })
    redirectSpy.mockRestore()
    notificationSpy.mockRestore()
  })

  it('surfaces the Retry-After header on ApiError as retryAfterSeconds', async () => {
    mockFetchOnce({ ok: false, status: 423, json: {}, headers: { 'retry-after': '1800' } })

    await expect(request('/login')).rejects.toMatchObject({ status: 423, retryAfterSeconds: 1800 })
  })

  it('leaves retryAfterSeconds undefined when the response has no Retry-After header', async () => {
    mockFetchOnce({ ok: false, status: 400, json: {} })

    const error = (await request('/login').catch((e: unknown) => e)) as ApiError
    expect(error.retryAfterSeconds).toBeUndefined()
  })

  it('throws ApiError with status 500 without redirecting', async () => {
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})
    mockFetchOnce({ ok: false, status: 500, json: {} })

    await expect(request('/fail')).rejects.toMatchObject({ status: 500 })
    expect(redirectSpy).not.toHaveBeenCalled()
    redirectSpy.mockRestore()
  })
})
