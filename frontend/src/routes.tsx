import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './pages/Layout'
import Reports from './pages/Reports'
import AdminUsers from './pages/admin/AdminUsers'
import AdminClients from './pages/admin/AdminClients'
import AdminProjects from './pages/admin/AdminProjects'
import AdminTasks from './pages/admin/AdminTasks'
import AdminAssignments from './pages/admin/AdminAssignments'
import AdminHourSettings from './pages/admin/AdminHourSettings'
import AdminMonthLock from './pages/admin/AdminMonthLock'
import AdminEmployeeReports from './pages/admin/AdminEmployeeReports'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import NotFound from './pages/NotFound'
import AdminShell from './components/AdminShell'
import RequireAuth from './components/RequireAuth'
import RequireRole from './components/RequireRole'
import RequireGuest from './components/RequireGuest'
import { ADMIN_HOME_PATH } from './services/authPaths'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <RequireAuth>
            <Reports />
          </RequireAuth>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireAuth>
            <RequireRole role="admin">
              <AdminShell />
            </RequireRole>
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to={ADMIN_HOME_PATH} replace /> },
          { path: 'assignments', element: <AdminAssignments /> },
          { path: 'hour-settings', element: <AdminHourSettings /> },
          { path: 'month-lock', element: <AdminMonthLock /> },
          { path: 'reports', element: <AdminEmployeeReports /> },
          { path: 'users', element: <AdminUsers /> },
          { path: 'clients', element: <AdminClients /> },
          { path: 'projects', element: <AdminProjects /> },
          { path: 'tasks', element: <AdminTasks /> },
        ],
      },
      {
        path: 'login',
        element: (
          <RequireGuest>
            <Login />
          </RequireGuest>
        ),
      },
      {
        path: 'change-password',
        element: (
          <RequireAuth>
            <ChangePassword />
          </RequireAuth>
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default router
