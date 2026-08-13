import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu } from "antd";

const items = [
  { key: "/", label: <Link to="/">Reports</Link> },
  { key: "/absences", label: <Link to="/absences">Absences</Link> },
  { key: "/admin", label: <Link to="/admin">Admin</Link> },
];

function Layout() {
  const { pathname } = useLocation();

  return (
    <div>
      <Menu mode="horizontal" selectedKeys={[pathname]} items={items} />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
