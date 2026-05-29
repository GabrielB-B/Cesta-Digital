import { useEffect, useState } from "react";
import {
  ChevronDown,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  X,
} from "lucide-react";
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

type FlashMessage = {
  type: "success" | "error";
  message: string;
};

type RouteState = {
  flash?: FlashMessage;
};

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

function getInitials(name?: string | null): string {
  if (!name) {
    return "U";
  }

  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const userRoles = user?.roles ?? [];
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(getInitialSidebarState);
  const [dismissedFlashKey, setDismissedFlashKey] = useState<string | null>(
    null
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const routeState = location.state as RouteState | null;
  const routeFlash =
    routeState?.flash?.message && dismissedFlashKey !== location.key
      ? routeState.flash
      : null;

  useEffect(() => {
    if (!routeState?.flash?.message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDismissedFlashKey(location.key);
    }, 6000);

    return () => window.clearTimeout(timeoutId);
  }, [location.key, routeState?.flash?.message]);

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
  const SidebarToggleIcon = isSidebarCollapsed
    ? PanelLeftOpen
    : PanelLeftClose;

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

  async function handleLogout() {
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
    await logout();
  }

  const shellClasses = [
    "app-shell",
    isSidebarCollapsed ? "app-shell--sidebar-collapsed" : null,
    isMobileMenuOpen ? "app-shell--mobile-menu-open" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const accountInitials = getInitials(user?.name);

  return (
    <>
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteudo
      </a>

      <div className={shellClasses}>
        <aside className="sidebar" aria-label="Navegacao principal">
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
                className="sidebar__mobile-close"
                type="button"
                aria-label="Fechar menu"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>

              <button
                className="sidebar__toggle"
                type="button"
                aria-expanded={!isSidebarCollapsed}
                aria-label={
                  isSidebarCollapsed
                    ? "Expandir menu lateral"
                    : "Recolher menu lateral"
                }
                title={
                  isSidebarCollapsed
                    ? "Expandir menu lateral"
                    : "Recolher menu lateral"
                }
                onClick={toggleSidebar}
              >
                <SidebarToggleIcon
                  className="sidebar__toggle-icon"
                  aria-hidden="true"
                  strokeWidth={1.9}
                />
              </button>
            </div>

            <nav className="sidebar__nav">
              {visibleMenuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  aria-current={isActive(item.path) ? "page" : undefined}
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
              <button
                className="sidebar__footer-logout"
                type="button"
                onClick={handleLogout}
              >
                <AppIcon name="logout" className="button__icon" />
                <span>Sair</span>
              </button>
            </div>
          </div>

        </aside>

      <button
        className="mobile-drawer-backdrop"
        type="button"
        aria-label="Fechar menu"
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <main id="conteudo-principal" className="content">
        <header className="topbar">
          <div className="topbar__identity">
            <button
              className="topbar__menu"
              type="button"
              aria-label="Abrir menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={21} aria-hidden="true" />
            </button>

            <div className="topbar__brand">
              <BrandLockup variant="compact" title="Cesta Digital" subtitle="" />
            </div>

            <span className="topbar__section">{currentSection.label}</span>
          </div>

          <div className="topbar__actions">
            <div className="topbar__account">
              <button
                className="topbar__account-button"
                type="button"
                aria-label={`Conta de ${user?.name ?? "Usuario"}`}
                aria-haspopup="menu"
                aria-expanded={isAccountMenuOpen}
                onClick={() => setIsAccountMenuOpen((current) => !current)}
              >
                <span className="topbar__avatar" aria-hidden="true">
                  {accountInitials}
                </span>
                <span className="topbar__account-text">
                  <strong>{user?.name ?? "Usuario"}</strong>
                  <span>
                    {user?.login_name ? `@${user.login_name}` : "Sessao ativa"}
                  </span>
                </span>
                <ChevronDown
                  className="topbar__account-chevron"
                  size={17}
                  aria-hidden="true"
                />
              </button>

              {isAccountMenuOpen ? (
                <div className="topbar__account-menu" role="menu">
                  <div className="topbar__account-menu-header">
                    <UserRound size={17} aria-hidden="true" />
                    <div>
                      <strong>{primaryRole}</strong>
                      <span>
                        {user?.login_name
                          ? `@${user.login_name}`
                          : "Sessao ativa"}
                      </span>
                    </div>
                  </div>

                  <button
                    className="topbar__account-menu-item"
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <AppIcon name="logout" className="button__icon" />
                    <span>Sair</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="page-content">
          {routeFlash ? (
            <p
              className={`flash-message flash-message--${routeFlash.type}`}
              role={routeFlash.type === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {routeFlash.message}
            </p>
          ) : null}

          <Outlet />
        </section>
      </main>
      </div>
    </>
  );
}
