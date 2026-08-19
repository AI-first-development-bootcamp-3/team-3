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

function HomeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 9.5 10 4l6 5.5V16a1 1 0 0 1-1 1h-3.5v-4h-3v4H5a1 1 0 0 1-1-1V9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
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
            to="/admin"
            end
            className={({ isActive }) =>
              isActive ? 'admin-sidebar__link admin-sidebar__link--active' : 'admin-sidebar__link'
            }
          >
            <span className="admin-sidebar__icon">
              <HomeIcon />
            </span>
            סקירה
          </NavLink>
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
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              isActive ? 'admin-sidebar__link admin-sidebar__link--active' : 'admin-sidebar__link'
            }
          >
            <span className="admin-sidebar__icon">
              <PeopleIcon />
            </span>
            משתמשים
          </NavLink>
          <NavLink
            to="/admin/reports"
            className={({ isActive }) =>
              isActive ? 'admin-sidebar__link admin-sidebar__link--active' : 'admin-sidebar__link'
            }
          >
            <span className="admin-sidebar__icon">
              <EditIcon />
            </span>
            דיווחי עובדים
          </NavLink>
          <NavLink
            to="/admin/month-lock"
            className={({ isActive }) =>
              isActive ? 'admin-sidebar__link admin-sidebar__link--active' : 'admin-sidebar__link'
            }
          >
            <span className="admin-sidebar__icon">
              <LockIcon />
            </span>
            נעילת חודש
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
