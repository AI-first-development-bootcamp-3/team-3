import { NavLink, Outlet } from 'react-router-dom'
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

function AdminShell() {
  const user = sessionStore((state) => state.user)

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <img src={abraLogo} alt="abra" width={107} height={24} />
        </div>
        <nav className="admin-sidebar__nav" aria-label="ניהול">
          <NavLink
            to="/admin/assignments"
            className={({ isActive }) =>
              isActive ? 'admin-sidebar__link admin-sidebar__link--active' : 'admin-sidebar__link'
            }
          >
            <span className="admin-sidebar__icon">
              <FolderIcon />
            </span>
            ניהול לקוחות/פרויקטים
          </NavLink>
          <NavLink
            to="/admin/hour-settings"
            className={({ isActive }) =>
              isActive ? 'admin-sidebar__link admin-sidebar__link--active' : 'admin-sidebar__link'
            }
          >
            <span className="admin-sidebar__icon">
              <ClockIcon />
            </span>
            הגדרת דיווחי שעות
          </NavLink>
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
