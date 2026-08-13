import { createBrowserRouter } from "react-router-dom";
import Layout from "./pages/Layout";
import Reports from "./pages/Reports";
import Absences from "./pages/Absences";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Reports /> },
      { path: "absences", element: <Absences /> },
      { path: "admin", element: <Admin /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;
