import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const menuItems = [
  { path: "/", label: "Dashboard" },
  { path: "/families", label: "Famílias" },
  { path: "/items", label: "Itens" },
  { path: "/basket-types", label: "Cestas" },
];

/**
 * Layout principal da aplicação autenticada.
 */
export function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  function isActive(path: string): boolean {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__overlay" />

        <div className="sidebar__content">
          <div className="sidebar__brand">
            <h1>Cesta Digital</h1>
            <p>UPG • Gestão social e operacional</p>
          </div>

          <nav className="sidebar__nav">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={
                  isActive(item.path)
                    ? "sidebar__link sidebar__link--active"
                    : "sidebar__link"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="topbar__welcome">
            <strong>{user?.name ?? "Usuário"}</strong>
            <span className="topbar__email">{user?.email}</span>
          </div>

          <button className="button button--secondary" onClick={logout}>
            Sair
          </button>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}