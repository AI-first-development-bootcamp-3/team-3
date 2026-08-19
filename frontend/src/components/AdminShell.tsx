import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import UserMenu from './UserMenu'
import { sessionStore } from '../services/sessionStore'
import abraLogo from '../assets/home/abra-logo.svg'
import './AdminShell.css'

function FolderIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h3.2L9 6.8h6.5A1.5 1.5 0 0 1 17 8.3v6.2a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5V10l2.5 1.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 15c.7-2 2.2-3 4-3s3.3 1 4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="13.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 12.2c1.5.2 2.7 1.1 3.3 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 13.2 12.8 4.9a1.5 1.5 0 0 1 2.1 0l.2.2a1.5 1.5 0 0 1 0 2.1L6.8 15.5H4.5v-2.3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M11.6 6.1 13.9 8.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9V7.2a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.5 16.5V5.5A1.5 1.5 0 0 1 6 4h8a1.5 1.5 0 0 1 1.5 1.5v11" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7h.01M12 7h.01M8 10.5h.01M12 10.5h.01M8 14h.01M12 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h1A1.5 1.5 0 0 1 12 5.5V7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function TaskIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="3.5" width="12" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8h6M7 11.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const ADMIN_NAV = [
  { to: '/admin/assignments', label: 'ניהול לקוחות/פרויקטים', icon: FolderIcon },
  { to: '/admin/clients', label: 'לקוחות', icon: BuildingIcon },
  { to: '/admin/projects', label: 'פרויקטים', icon: BriefcaseIcon },
  { to: '/admin/tasks', label: 'משימות', icon: TaskIcon },
  { to: '/admin/hour-settings', label: 'הגדרת דיווחי שעות', icon: ClockIcon },
  { to: '/admin/users', label: 'משתמשים', icon: PeopleIcon },
  { to: '/admin/reports', label: 'דיווחי עובדים', icon: EditIcon },
  { to: '/admin/month-lock', label: 'נעילת חודש', icon: LockIcon },
] as const

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function AdminShell() {
  const user = sessionStore((state) => state.user)
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <div className={menuOpen ? 'admin-shell admin-shell--menu-open' : 'admin-shell'}>
      {menuOpen ? (
        <button
          type="button"
          className="admin-shell__scrim"
          aria-label="סגירת תפריט"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <aside className={menuOpen ? 'admin-sidebar admin-sidebar--open' : 'admin-sidebar'}>
        <div className="admin-sidebar__top">
          <button
            type="button"
            className="admin-sidebar__menu-btn"
            aria-label={menuOpen ? 'סגירת תפריט ניהול' : 'תפריט ניהול'}
            aria-expanded={menuOpen}
            aria-controls="admin-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon />
          </button>
          <div className="admin-sidebar__brand">
            <img src={abraLogo} alt="abra" width={107} height={24} />
          </div>
        </div>
        <nav id="admin-nav" className="admin-sidebar__nav" aria-label="ניהול">
          {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? 'admin-sidebar__link admin-sidebar__link--active' : 'admin-sidebar__link'
              }
              onClick={() => setMenuOpen(false)}
            >
              <span className="admin-sidebar__icon">
                <Icon />
              </span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__profile">
          <UserMenu />
          {user ? (
            <div className="admin-sidebar__who">
              <p className="admin-sidebar__name">{user.fullName}</p>
              <p className="admin-sidebar__role">{user.userType === 'admin' ? 'מנהל מערכת' : 'עובד'}</p>
            </div>
          ) : null}
        </div>
      </aside>
      <div className="admin-shell__main">
        <Outlet />
      </div>
    </div>
  )
}

export default AdminShell
