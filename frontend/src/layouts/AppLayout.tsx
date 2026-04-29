import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AppIcon } from "../components/AppIcon";
import { BrandLockup } from "../components/BrandLockup";
import { useAuth } from "../contexts/useAuth";

type MenuIconName =
  | "dashboard"
  | "families"
  | "finance"
  | "items"
  | "categories"
  | "baskets"
  | "deliveries"
  | "audit"
  | "users";

const SIDEBAR_STORAGE_KEY = "cestaDigital.sidebarCollapsed";

function getInitialSidebarState(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function formatRole(role: string): string {
  if (role === "admin") {
    return "Administrador";
  }

  if (role === "lider_social") {
    return "Lider social";
  }

  if (role === "operador") {
    return "Operador";
  }

  return "Usuario";
}

export function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const userRoles = user?.roles ?? [];
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(getInitialSidebarState);

  function hasAnyRole(...roles: string[]): boolean {
    return roles.some((role) => userRoles.includes(role));
  }

  const menuItems = [
    { path: "/", label: "Dashboard", icon: "dashboard", visible: true },
    {
      path: "/families",
      label: "Familias",
      icon: "families",
      visible: hasAnyRole("admin", "lider_social"),
    },
    {
      path: "/financial-summary",
      label: "Financeiro",
      icon: "finance",
      visible: hasAnyRole("admin", "lider_social"),
    },
    {
      path: "/items",
      label: "Itens",
      icon: "items",
      visible: hasAnyRole("admin", "operador"),
    },
    {
      path: "/item-categories",
      label: "Categorias",
      icon: "categories",
      visible: hasAnyRole("admin", "operador"),
    },
    {
      path: "/basket-types",
      label: "Cestas",
      icon: "baskets",
      visible: hasAnyRole("admin", "operador"),
    },
    {
      path: "/deliveries",
      label: "Entregas",
      icon: "deliveries",
      visible: hasAnyRole("admin", "operador"),
    },
    {
      path: "/users",
      label: "Usuarios",
      icon: "users",
      visible: hasAnyRole("admin"),
    },
    {
      path: "/audit-logs",
      label: "Auditoria",
      icon: "audit",
      visible: hasAnyRole("admin"),
    },
  ] satisfies Array<{
    path: string;
    label: string;
    icon: MenuIconName;
    visible: boolean;
  }>;

  const visibleMenuItems = menuItems.filter((item) => item.visible);

  const currentSection =
    visibleMenuItems.find(
      (item) => item.path !== "/" && location.pathname.startsWith(item.path)
    ) ?? visibleMenuItems[0];

  const primaryRole = formatRole(userRoles[0] ?? "");

  function isActive(path: string): boolean {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  }

  function toggleSidebar() {
    setIsSidebarCollapsed((current) => {
      const nextState = !current;

      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextState));
      }

      return nextState;
    });
  }

  return (
    <div
      className={
        isSidebarCollapsed
          ? "app-shell app-shell--sidebar-collapsed"
          : "app-shell"
      }
    >
      <aside className="sidebar">
        <div className="sidebar__overlay" />

        <div className="sidebar__content">
          <div className="sidebar__brand-row">
            <div className="sidebar__brand">
              <BrandLockup
                variant="sidebar"
                title="Cesta Digital"
                subtitle="UPG | Gestao social e operacional"
              />
            </div>

            <button
              className="sidebar__toggle"
              type="button"
              aria-expanded={!isSidebarCollapsed}
              aria-label={
                isSidebarCollapsed
                  ? "Expandir menu lateral"
                  : "Recolher menu lateral"
              }
              onClick={toggleSidebar}
            >
              <span className="sidebar__toggle-glyph" aria-hidden="true">
                <span className="sidebar__toggle-dots">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="sidebar__toggle-lines">
                  <span />
                  <span />
                </span>
                <span className="sidebar__toggle-arrow" />
              </span>
            </button>
          </div>

          <nav className="sidebar__nav">
            {visibleMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                title={isSidebarCollapsed ? item.label : undefined}
                className={
                  isActive(item.path)
                    ? "sidebar__link sidebar__link--active"
                    : "sidebar__link"
                }
              >
                <span className="sidebar__link-icon">
                  <AppIcon name={item.icon} />
                </span>
                <span className="sidebar__link-label">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="sidebar__footer">
            <span className="sidebar__footer-label">Sessao ativa</span>
            <strong>{user?.name ?? "Usuario"}</strong>
            <p>{primaryRole}</p>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <span className="topbar__section">{currentSection.label}</span>

          <div className="topbar__actions">
            <div className="topbar__welcome">
              <strong>{user?.name ?? "Usuario"}</strong>
              <span className="topbar__email">{user?.email}</span>
            </div>

            <button className="button button--secondary button--icon" onClick={logout}>
              <AppIcon name="logout" className="button__icon" />
              <span>Sair</span>
            </button>
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
