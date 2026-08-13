import { NavLink, Outlet } from 'react-router-dom'

function Layout() {
  return (
    <div>
      <nav>
        <NavLink to="/">Reports</NavLink>
        <NavLink to="/absences">Absences</NavLink>
        <NavLink to="/admin">Admin</NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
