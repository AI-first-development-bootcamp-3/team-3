import { createBrowserRouter } from "react-router-dom";
import Layout from "./pages/Layout";
import Reports from "./pages/Reports";
import Absences from "./pages/Absences";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import SampleForm from "./components/SampleForm";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Reports /> },
      { path: "absences", element: <Absences /> },
      { path: "admin", element: <Admin /> },
      // Not in the main nav Menu - a living form-pattern reference, see SCRUM-37.
      { path: "dev/sample-form", element: <SampleForm /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;
