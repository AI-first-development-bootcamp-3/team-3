import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu } from "antd";
import { logoutAndRedirect } from "../services/auth";

const items = [
  { key: "/", label: <Link to="/">דיווח שעות</Link> },
  { key: "/absences", label: <Link to="/absences">היעדרויות</Link> },
  { key: "/admin", label: <Link to="/admin">ניהול</Link> },
  { key: "logout", label: "התנתקות", onClick: logoutAndRedirect, style: { marginInlineStart: "auto" } },
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
