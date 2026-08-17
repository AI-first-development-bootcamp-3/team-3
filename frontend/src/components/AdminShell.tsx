import { Link, Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'antd'

// Month-closing (SCRUM-8) gets a slot in the nav but no route yet - visible,
// disabled, not part of this shell's scope. See admin-area-shell/proposal.md.
const items = [
  { key: '/admin', label: <Link to="/admin">סקירה כללית</Link> },
  { key: '/admin/users', label: <Link to="/admin/users">משתמשים</Link> },
  { key: '/admin/clients', label: <Link to="/admin/clients">לקוחות</Link> },
  { key: '/admin/projects', label: <Link to="/admin/projects">פרויקטים</Link> },
  { key: '/admin/tasks', label: <Link to="/admin/tasks">משימות</Link> },
  { key: '/admin/assignments', label: <Link to="/admin/assignments">שיוכים</Link> },
  { key: '/admin/month-closing', label: 'סגירת חודש', disabled: true },
]

function AdminShell() {
  const { pathname } = useLocation()

  return (
    <div className="admin-shell">
      <Menu mode="horizontal" selectedKeys={[pathname]} items={items} style={{ direction: 'rtl' }} />
      <main className="admin-shell__content">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminShell
