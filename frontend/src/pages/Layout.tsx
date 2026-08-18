import { Outlet } from 'react-router-dom'
import SessionGuard from '../components/SessionGuard'

/** App chrome lives on each product shell (employee home, admin), not a global Ant menu. */
function Layout() {
  return (
    <div className="app-shell">
      <SessionGuard />
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
