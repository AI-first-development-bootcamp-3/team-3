import { createBrowserRouter } from "react-router-dom";
import Layout from "./pages/Layout";
import Reports from "./pages/Reports";
import Absences from "./pages/Absences";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";
import SampleForm from "./components/SampleForm";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";

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
              <Admin />
            </RequireRole>
          </RequireAuth>
        ),
      },
      { path: "login", element: <Login /> },
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
