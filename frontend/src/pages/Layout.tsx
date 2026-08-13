import { NavLink, Outlet } from 'react-router-dom'

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'active' : undefined

function Layout() {
  return (
    <div>
      <nav>
        <NavLink to="/" end className={navLinkClassName}>
          Reports
        </NavLink>
        <NavLink to="/absences" className={navLinkClassName}>
          Absences
        </NavLink>
        <NavLink to="/admin" className={navLinkClassName}>
          Admin
        </NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
