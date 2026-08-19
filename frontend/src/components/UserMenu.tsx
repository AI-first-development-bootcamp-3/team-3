import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { logoutAndRedirect } from '../services/auth'
import { ADMIN_HOME_PATH } from '../services/authPaths'
import { sessionStore } from '../services/sessionStore'
import './UserMenu.css'

function initialsFor(name: string): string {
  const first = name.trim().split(/\s+/).find(Boolean)
  if (!first) return '?'
  return first[0].toUpperCase()
}

function UserMenu() {
  const user = sessionStore((state) => state.user)
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!confirming) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirming(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [confirming])

  if (!user) return null

  const isAdmin = user.userType === 'admin'
  const onAdmin = location.pathname.startsWith('/admin')

  const confirmLogout = async () => {
    setLoggingOut(true)
    await logoutAndRedirect()
  }

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu__avatar"
        aria-label="תפריט חשבון"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {initialsFor(user.fullName)}
      </button>

      {open ? (
        <div className="user-menu__panel" role="menu">
          <div className="user-menu__identity">
            <p className="user-menu__name">{user.fullName}</p>
            <p className="user-menu__email">{user.email}</p>
          </div>

          {isAdmin && onAdmin ? (
            <Link className="user-menu__item" role="menuitem" to="/" onClick={() => setOpen(false)}>
              דיווח שעות
            </Link>
          ) : null}

          {isAdmin && !onAdmin ? (
            <Link className="user-menu__item" role="menuitem" to={ADMIN_HOME_PATH} onClick={() => setOpen(false)}>
              ניהול
            </Link>
          ) : null}

          <Link
            className="user-menu__item"
            role="menuitem"
            to="/change-password"
            onClick={() => setOpen(false)}
          >
            שינוי סיסמה
          </Link>

          <button
            type="button"
            className="user-menu__item user-menu__item--danger"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              setConfirming(true)
            }}
          >
            התנתקות
          </button>
        </div>
      ) : null}

      {confirming
        ? createPortal(
            <div
              className="user-menu__modal-overlay"
              role="presentation"
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) setConfirming(false)
              }}
            >
              <div className="user-menu__modal" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title">
                <h2 id="logout-dialog-title">להתנתק?</h2>
                <div className="user-menu__modal-actions">
                  <button type="button" className="user-menu__modal-cancel" onClick={() => setConfirming(false)}>
                    ביטול
                  </button>
                  <button
                    type="button"
                    className="user-menu__modal-confirm"
                    disabled={loggingOut}
                    onClick={() => void confirmLogout()}
                  >
                    התנתקות
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

export default UserMenu
