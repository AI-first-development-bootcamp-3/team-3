import { createBrowserRouter } from "react-router-dom";
import Layout from "./pages/Layout";
import Reports from "./pages/Reports";
import Absences from "./pages/Absences";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminClients from "./pages/admin/AdminClients";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminAssignments from "./pages/admin/AdminAssignments";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";
import SampleForm from "./components/SampleForm";
import AdminShell from "./components/AdminShell";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";
import RequireGuest from "./components/RequireGuest";

const router = createBrowserRouter([
  {
    path: "/",
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
        path: "absences",
        element: (
          <RequireAuth>
            <Absences />
          </RequireAuth>
        ),
      },
      {
        path: "admin",
        element: (
          <RequireAuth>
            <RequireRole role="admin">
              <AdminShell />
            </RequireRole>
          </RequireAuth>
        ),
        children: [
          { index: true, element: <AdminOverview /> },
          { path: "users", element: <AdminUsers /> },
          { path: "clients", element: <AdminClients /> },
          { path: "projects", element: <AdminProjects /> },
          { path: "tasks", element: <AdminTasks /> },
          { path: "assignments", element: <AdminAssignments /> },
        ],
      },
      {
        path: "login",
        element: (
          <RequireGuest>
            <Login />
          </RequireGuest>
        ),
      },
      {
        path: "change-password",
        element: (
          <RequireAuth>
            <ChangePassword />
          </RequireAuth>
        ),
      },
      // Not in the main nav Menu - a living form-pattern reference, see SCRUM-37.
      { path: "dev/sample-form", element: <SampleForm /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;
