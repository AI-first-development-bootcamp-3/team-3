import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu } from "antd";

const items = [
  { key: "/", label: <Link to="/">דיווח שעות</Link> },
  { key: "/absences", label: <Link to="/absences">היעדרויות</Link> },
  { key: "/admin", label: <Link to="/admin">ניהול</Link> },
];

function Layout() {
  const { pathname } = useLocation();
  const showAppMenu = pathname !== "/";

  return (
    <div className="app-shell">
      {showAppMenu ? (
        <Menu mode="horizontal" selectedKeys={[pathname]} items={items} />
      ) : null}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
