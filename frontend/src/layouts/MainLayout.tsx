import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();

  const menuItems = [
    { label: "Início", to: "/" },
    { label: "Famílias", to: "/familias" },
    { label: "Estoque", to: "/estoque" },
    { label: "Entregas", to: "/entregas" },
    { label: "Prestação de Contas", to: "/prestacao-contas" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Cesta Digital</div>

        <nav className="menu">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`menu-item ${isActive ? "active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}