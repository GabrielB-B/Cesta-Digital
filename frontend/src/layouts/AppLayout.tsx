import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AppIcon } from "../components/AppIcon";
import { BrandLockup } from "../components/BrandLockup";
import { EnvironmentNotice } from "../components/EnvironmentNotice";
import { useAuth } from "../contexts/useAuth";
import { getRouteMeta } from "../routes/routeMeta";

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

type MenuGroupName =
  | "Principal"
  | "Social"
  | "Estoque"
  | "Distribuicao"
  | "Administracao";

function getInitialSidebarState(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getInitialMobileViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(max-width: 900px)").matches;
}

function formatRole(role: string): string {
  if (role === "admin") {
    return "Administrador";
  }

  if (role === "lider_social") {
    return "Liderança social";
  }

  if (role === "operador") {
    return "Operador";
  }

  return "Usuário";
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
  const navigationToggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const userRoles = user?.roles ?? [];
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(getInitialSidebarState);
  const [dismissedFlashKey, setDismissedFlashKey] = useState<string | null>(
    null
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(getInitialMobileViewport);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const handleViewportChange = () => {
      setIsMobileViewport(mediaQuery.matches);

      if (!mediaQuery.matches) {
        setIsMobileMenuOpen(false);
      }
    };

    handleViewportChange();
    mediaQuery.addEventListener("change", handleViewportChange);

    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  useEffect(() => {
    if (!isMobileViewport || !isMobileMenuOpen) {
      return;
    }

    const sidebar = sidebarRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : navigationToggleRef.current;

    const getFocusableElements = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => !element.hasAttribute("disabled"));

    document.body.style.overflow = "hidden";
    getFocusableElements()[0]?.focus();

    const handleDrawerKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsMobileMenuOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleDrawerKeyDown);

    return () => {
      document.removeEventListener("keydown", handleDrawerKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocusedElement?.focus();
    };
  }, [isMobileMenuOpen, isMobileViewport]);

  function hasAnyRole(...roles: string[]): boolean {
    return roles.some((role) => userRoles.includes(role));
  }

  const menuItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: "dashboard",
      group: "Principal",
      visible: true,
    },
    {
      path: "/families",
      label: "Famílias",
      icon: "families",
      group: "Social",
      visible: hasAnyRole("admin", "lider_social"),
    },
    {
      path: "/financial-summary",
      label: "Financeiro",
      icon: "finance",
      group: "Social",
      visible: hasAnyRole("admin", "lider_social"),
    },
    {
      path: "/items",
      label: "Itens",
      icon: "items",
      group: "Estoque",
      visible: hasAnyRole("admin", "operador"),
    },
    {
      path: "/item-categories",
      label: "Categorias",
      icon: "categories",
      group: "Estoque",
      visible: hasAnyRole("admin", "operador"),
    },
    {
      path: "/basket-types",
      label: "Cestas",
      icon: "baskets",
      group: "Distribuicao",
      visible: hasAnyRole("admin", "operador"),
    },
    {
      path: "/deliveries",
      label: "Entregas",
      icon: "deliveries",
      group: "Distribuicao",
      visible: hasAnyRole("admin", "operador"),
    },
    {
      path: "/users",
      label: "Usuários",
      icon: "users",
      group: "Administracao",
      visible: hasAnyRole("admin"),
    },
    {
      path: "/audit-logs",
      label: "Auditoria",
      icon: "audit",
      group: "Administracao",
      visible: hasAnyRole("admin"),
    },
  ] satisfies Array<{
    path: string;
    label: string;
    icon: MenuIconName;
    group: MenuGroupName;
    visible: boolean;
  }>;

  const visibleMenuItems = menuItems.filter((item) => item.visible);
  const menuGroups = [
    "Principal",
    "Social",
    "Estoque",
    "Distribuicao",
    "Administracao",
  ].map((group) => ({
    group,
    items: visibleMenuItems.filter((item) => item.group === group),
  })).filter((group) => group.items.length > 0);

  const routeMeta = getRouteMeta(location.pathname);
  const currentSection =
    visibleMenuItems.find((item) => item.path === routeMeta.sectionPath) ??
    visibleMenuItems.find(
      (item) => item.path !== "/" && location.pathname.startsWith(item.path)
    ) ??
    visibleMenuItems[0];

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

  async function handleLogout() {
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
    await logout();
  }

  function handleNavigationToggle() {
    if (isMobileViewport) {
      setIsMobileMenuOpen(true);
      return;
    }

    toggleSidebar();
  }

  const shellClasses = [
    "app-shell",
    isSidebarCollapsed ? "app-shell--sidebar-collapsed" : null,
    isMobileMenuOpen ? "app-shell--mobile-menu-open" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const accountInitials = getInitials(user?.name);
  const navigationToggleLabel = isMobileViewport
    ? "Abrir menu"
    : isSidebarCollapsed
      ? "Expandir menu lateral"
      : "Recolher menu lateral";

  return (
    <>
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>

      <div className={shellClasses}>
        <aside
          ref={sidebarRef}
          id="main-navigation"
          className="sidebar"
          aria-label="Navegação principal"
          aria-hidden={isMobileViewport && !isMobileMenuOpen ? true : undefined}
          inert={isMobileViewport && !isMobileMenuOpen ? true : undefined}
        >
          <div className="sidebar__overlay" />

          <div className="sidebar__content">
            <div className="sidebar__brand-row">
              <div className="sidebar__brand">
                <BrandLockup
                  variant="sidebar"
                  title="Cesta Digital"
                  subtitle="UPG | Gestão social e operacional"
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
            </div>

            <nav className="sidebar__nav">
              {menuGroups.map(({ group, items }) => (
                <div className="sidebar__nav-group" key={group}>
                  <span className="sidebar__nav-group-label">{group}</span>

                  {items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      data-label={item.label}
                      aria-label={isSidebarCollapsed ? item.label : undefined}
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
                </div>
              ))}
            </nav>

            <div className="sidebar__footer">
              <span className="sidebar__footer-label">Sessão ativa</span>
              <strong>{user?.name ?? "Usuário"}</strong>
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

      {isMobileViewport && isMobileMenuOpen ? (
        <button
          className="mobile-drawer-backdrop"
          type="button"
          aria-label="Fechar menu"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      ) : null}

      <main id="conteudo-principal" className="content" tabIndex={-1}>
        <header className="topbar">
          <div className="topbar__identity">
            <button
              ref={navigationToggleRef}
              className="topbar__menu"
              type="button"
              aria-label={navigationToggleLabel}
              aria-controls="main-navigation"
              aria-expanded={isMobileViewport ? isMobileMenuOpen : !isSidebarCollapsed}
              title={navigationToggleLabel}
              onClick={handleNavigationToggle}
            >
              <Menu size={21} aria-hidden="true" />
            </button>

            <div className="topbar__brand">
              <BrandLockup variant="compact" title="Cesta Digital" subtitle="" />
            </div>

            <span className="topbar__section">
              {routeMeta.section || currentSection.label}
            </span>
          </div>

          <div className="topbar__actions">
            <div className="topbar__account">
              <button
                className="topbar__account-button"
                type="button"
                aria-label={`Conta de ${user?.name ?? "Usuário"}`}
                aria-haspopup="menu"
                aria-expanded={isAccountMenuOpen}
                title={user?.login_name ? `${user.name} (@${user.login_name})` : user?.name ?? "Usuário"}
                onClick={() => setIsAccountMenuOpen((current) => !current)}
              >
                <span className="topbar__avatar" aria-hidden="true">
                  {accountInitials}
                </span>
                <span className="topbar__account-text">
                  <strong>{user?.name ?? "Usuário"}</strong>
                  <span>
                    {user?.login_name ? `@${user.login_name}` : "Sessão ativa"}
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
                          : "Sessão ativa"}
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
          <EnvironmentNotice compact />

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
