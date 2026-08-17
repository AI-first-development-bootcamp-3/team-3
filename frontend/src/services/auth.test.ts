import { afterEach, describe, expect, it, vi } from 'vitest'
import { notification } from 'antd'
import { logoutAndRedirect } from './auth'
import { sessionStore } from './sessionStore'
import { queryClient } from './queryClient'
import * as navigation from './navigation'
import type { User } from '../types'

function mockFetchOnce(response: { ok: boolean; status: number; json?: unknown; headers?: Record<string, string> }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    headers: new Headers({ 'content-type': 'application/json', ...response.headers }),
    json: async () => response.json ?? {},
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const user: User = { id: '1', fullName: 'Admin', email: 'admin@abra.test', userType: 'admin', active: true }

function establishSession(rememberMe = false) {
  sessionStore.getState().setSession(user, 'a-token', new Date(Date.now() + 60_000).toISOString(), rememberMe)
  queryClient.setQueryData(['probe'], { secret: 'first-user-data' })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  sessionStore.getState().clearSession()
  queryClient.clear()
  window.sessionStorage.clear()
  window.localStorage.clear()
})

describe('logoutAndRedirect', () => {
  it('clears the session, clears the query cache, and redirects when the server call succeeds', async () => {
    establishSession()
    mockFetchOnce({ ok: true, status: 204 })
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})

    await logoutAndRedirect()

    expect(sessionStore.getState().token).toBeNull()
    expect(sessionStore.getState().user).toBeNull()
    expect(queryClient.getQueryData(['probe'])).toBeUndefined()
    expect(redirectSpy).toHaveBeenCalledOnce()
  })

  it('still tears down and redirects, without throwing or blocking, when the network is unreachable', async () => {
    establishSession()
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})

    await expect(logoutAndRedirect()).resolves.toBeUndefined()

    expect(sessionStore.getState().token).toBeNull()
    expect(queryClient.getQueryData(['probe'])).toBeUndefined()
    expect(redirectSpy).toHaveBeenCalledOnce()
  })

  it('still tears down and redirects when the server rejects the logout call with a 5xx', async () => {
    establishSession()
    mockFetchOnce({ ok: false, status: 500, json: { error: { code: 'INTERNAL_SERVER_ERROR', message: 'boom' } } })
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})

    await expect(logoutAndRedirect()).resolves.toBeUndefined()

    expect(sessionStore.getState().token).toBeNull()
    expect(queryClient.getQueryData(['probe'])).toBeUndefined()
    expect(redirectSpy).toHaveBeenCalledOnce()
  })

  it('tears down without surfacing a blocking error when the session was already revoked server-side (401)', async () => {
    establishSession()
    mockFetchOnce({ ok: false, status: 401, json: { error: { code: 'SESSION_REVOKED', message: 'Session has ended' } } })
    const redirectSpy = vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})
    const notifySpy = vi.spyOn(notification, 'warning').mockImplementation(() => '' as unknown as void)
    const errorNotifySpy = vi.spyOn(notification, 'error').mockImplementation(() => '' as unknown as void)

    await logoutAndRedirect()

    expect(sessionStore.getState().token).toBeNull()
    expect(redirectSpy).toHaveBeenCalledOnce()
    // handleUnauthorizedGlobally: false on the /logout call (D8) means this
    // 401 must not additionally trigger apiClient's "Session Expired" toast.
    expect(notifySpy).not.toHaveBeenCalled()
    expect(errorNotifySpy).not.toHaveBeenCalled()
  })

  it('leaves no persisted session in either storage after teardown, for a remembered session', async () => {
    establishSession(true)
    mockFetchOnce({ ok: true, status: 204 })
    vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})

    await logoutAndRedirect()

    expect(window.localStorage.getItem('abra.session')).toBeNull()
    expect(window.sessionStorage.getItem('abra.session')).toBeNull()
  })

  it('leaves no persisted session in either storage after teardown, even when the server call fails', async () => {
    establishSession(true)
    mockFetchOnce({ ok: false, status: 500, json: {} })
    vi.spyOn(navigation, 'redirectToLogin').mockImplementation(() => {})

    await logoutAndRedirect()

    expect(window.localStorage.getItem('abra.session')).toBeNull()
    expect(window.sessionStorage.getItem('abra.session')).toBeNull()
  })
})
