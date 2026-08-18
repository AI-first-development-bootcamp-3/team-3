import { useCallback, useEffect, useState } from 'react'
import { App } from 'antd'
import { ApiError } from '../services/apiClient'
import { discardClock, getClockSession, startClock, stopClock } from '../services/clock'
import { clockErrorMessage, formatElapsed } from '../lib/workClock'
import type { ClockSession } from '../types/clock'

interface Options {
  enabled: boolean
}

export function useWorkClock({ enabled }: Options) {
  const { notification } = App.useApp()
  const [session, setSession] = useState<ClockSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)

  const loadSession = useCallback(async (): Promise<ClockSession | null> => {
    if (!enabled) return null
    const { session: next } = await getClockSession()
    return next
  }, [enabled])

  const applySession = useCallback((next: ClockSession | null) => {
    setSession(next)
    if (next?.status === 'AWAITING_CONFIRM') {
      setConfirmOpen(true)
    }
  }, [])

  const refreshSession = useCallback(async () => {
    if (!enabled) {
      setSession(null)
      return
    }
    setLoading(true)
    try {
      applySession(await loadSession())
    } catch {
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [applySession, enabled, loadSession])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void loadSession()
      .then((next) => {
        if (!cancelled) applySession(next)
      })
      .catch(() => {
        if (!cancelled) setSession(null)
      })
    return () => {
      cancelled = true
    }
  }, [applySession, enabled, loadSession])

  useEffect(() => {
    if (!enabled) return
    const onFocus = () => {
      void refreshSession()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [enabled, refreshSession])

  const isActive = session?.status === 'ACTIVE'
  useEffect(() => {
    if (!isActive || !session?.startedAt) return
    const startedAt = session.startedAt
    const tick = () => setElapsedMs(Date.now() - new Date(startedAt).getTime())
    const immediate = window.setTimeout(tick, 0)
    const id = window.setInterval(tick, 1000)
    return () => {
      window.clearTimeout(immediate)
      window.clearInterval(id)
    }
  }, [isActive, session?.startedAt, session?.sessionId])

  const handleStart = useCallback(async () => {
    setActionLoading(true)
    try {
      const { session: next } = await startClock()
      setSession(next)
      setConfirmOpen(false)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? clockErrorMessage(error.body) ?? 'לא ניתן להפעיל את השעון כרגע'
          : 'לא ניתן להפעיל את השעון כרגע'
      notification.error({ message })
    } finally {
      setActionLoading(false)
    }
  }, [notification])

  const handleStop = useCallback(async () => {
    setActionLoading(true)
    try {
      const { session: next } = await stopClock()
      setSession(next)
      setConfirmOpen(true)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? clockErrorMessage(error.body) ?? 'לא ניתן לעצור את השעון'
          : 'לא ניתן לעצור את השעון'
      notification.error({ message })
    } finally {
      setActionLoading(false)
    }
  }, [notification])

  const handleDiscard = useCallback(async () => {
    setActionLoading(true)
    try {
      await discardClock()
      setSession(null)
      setConfirmOpen(false)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? clockErrorMessage(error.body) ?? 'לא ניתן לבטל את הטיוטה'
          : 'לא ניתן לבטל את הטיוטה'
      notification.error({ message })
    } finally {
      setActionLoading(false)
    }
  }, [notification])

  const closeConfirm = useCallback(() => {
    setConfirmOpen(false)
  }, [])

  const clearSession = useCallback(() => {
    setSession(null)
    setConfirmOpen(false)
  }, [])

  return {
    session,
    loading,
    actionLoading,
    confirmOpen,
    setConfirmOpen,
    elapsedLabel: formatElapsed(session?.status === 'ACTIVE' ? elapsedMs : 0),
    isActive: session?.status === 'ACTIVE',
    isAwaitingConfirm: session?.status === 'AWAITING_CONFIRM',
    refreshSession,
    handleStart,
    handleStop,
    handleDiscard,
    closeConfirm,
    clearSession,
  }
}
