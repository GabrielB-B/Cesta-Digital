import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Heart,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  X,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AppIcon } from "../components/AppIcon";
import { EnvironmentNotice } from "../components/EnvironmentNotice";
import { useAuth } from "../contexts/useAuth";
import { ROUTE_ACCESS, userHasAnyRole } from "../routes/routeAccess";
import { getRouteMeta } from "../routes/routeMeta";
import styles from "./AppLayout.module.css";

type MenuIconName =
  | "dashboard"
  | "families"
  | "assessments"
  | "finance"
  | "items"
  | "categories"
  | "baskets"
  | "deliveries"
  | "audit"
  | "users";

type FlashMessage = {
  type: "success" | "error";
  message: string;
};

type RouteState = {
  flash?: FlashMessage;
};

type MenuItem = {
  path: string;
  label: string;
  icon: MenuIconName;
  visible: boolean;
};

const SIDEBAR_STORAGE_KEY = "cestaDigital.sidebarCollapsed";
const MOBILE_BREAKPOINT = "(max-width: 899px)";

function getInitialSidebarState(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getInitialMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_BREAKPOINT).matches;
}

function formatRole(role: string): string {
  if (role === "admin") return "Administrador";
  if (role === "lider_social") return "Liderança social";
  if (role === "operador") return "Operador";
  return "Usuário";
}

function getInitials(name?: string | null): string {
  const parts = (name ?? "")
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "U";

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ShellBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      className={`${styles.brand}${compact ? ` ${styles.brandCompact}` : ""}`}
      to="/"
      aria-label="Cesta Digital, página principal"
    >
      <img src="/brand/cesta-digital-symbol.png" alt="" width="64" height="64" />
      <span className={styles.brandText} translate="no">
        <strong>Cesta</strong>
        <span>Digital</span>
      </span>
    </Link>
  );
}

export function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigationToggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const userRoles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getInitialSidebarState);
  const [dismissedFlashKey, setDismissedFlashKey] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(getInitialMobileViewport);
  const routeState = location.state as RouteState | null;
  const routeFlash =
    routeState?.flash?.message && dismissedFlashKey !== location.key
      ? routeState.flash
      : null;

  useEffect(() => {
    if (!routeState?.flash?.message) return;

    const timeoutId = window.setTimeout(() => setDismissedFlashKey(location.key), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [location.key, routeState?.flash?.message]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);
    const handleViewportChange = () => {
      setIsMobileViewport(mediaQuery.matches);
      if (!mediaQuery.matches) setIsMobileMenuOpen(false);
    };

    handleViewportChange();
    mediaQuery.addEventListener("change", handleViewportChange);
    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (!isMobileViewport || !isMobileMenuOpen) return;

    const sidebar = sidebarRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : navigationToggleRef.current;

    const getFocusableElements = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute("disabled"));

    document.body.style.overflow = "hidden";
    sidebar
      ?.querySelector<HTMLButtonElement>('button[aria-label="Fechar menu"]')
      ?.focus();

    const handleDrawerKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsMobileMenuOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

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

  const menuItems = useMemo(
    () =>
      [
        { path: "/", label: "Início", icon: "dashboard", visible: true },
        {
          path: "/families",
          label: "Famílias",
          icon: "families",
          visible: userHasAnyRole(userRoles, ROUTE_ACCESS.social),
        },
        {
          path: "/assessments",
          label: "Avaliações",
          icon: "assessments",
          visible: userHasAnyRole(userRoles, ROUTE_ACCESS.social),
        },
        {
          path: "/financial-summary",
          label: "Financeiro",
          icon: "finance",
          visible: userHasAnyRole(userRoles, ROUTE_ACCESS.social),
        },
        {
          path: "/items",
          label: "Estoque",
          icon: "items",
          visible: userHasAnyRole(userRoles, ROUTE_ACCESS.operations),
        },
        {
          path: "/item-categories",
          label: "Categorias",
          icon: "categories",
          visible: userHasAnyRole(userRoles, ROUTE_ACCESS.operations),
        },
        {
          path: "/basket-types",
          label: "Tipos de Cesta",
          icon: "baskets",
          visible: userHasAnyRole(userRoles, ROUTE_ACCESS.operations),
        },
        {
          path: "/deliveries",
          label: "Entregas",
          icon: "deliveries",
          visible: userHasAnyRole(userRoles, ROUTE_ACCESS.operations),
        },
        {
          path: "/users",
          label: "Usuários",
          icon: "users",
          visible: userHasAnyRole(userRoles, ROUTE_ACCESS.administration),
        },
        {
          path: "/audit-logs",
          label: "Auditoria",
          icon: "audit",
          visible: userHasAnyRole(userRoles, ROUTE_ACCESS.administration),
        },
      ].filter((item) => item.visible) as MenuItem[],
    [userRoles],
  );

  const routeMeta = getRouteMeta(location.pathname);
  const currentSection =
    routeMeta.pattern === "*"
      ? undefined
      : menuItems.find((item) => item.path === routeMeta.sectionPath) ??
        menuItems.find(
          (item) => item.path !== "/" && location.pathname.startsWith(item.path),
        );
  const mobileQuickItems = useMemo(() => {
    const priorityPaths = [
      "/",
      "/families",
      "/assessments",
      "/items",
      "/deliveries",
      "/financial-summary",
    ];
    const priorityItems = priorityPaths
      .map((path) => menuItems.find((item) => item.path === path))
      .filter((item): item is MenuItem => Boolean(item))
      .slice(0, 3);

    if (
      currentSection &&
      !priorityItems.some((item) => item.path === currentSection.path)
    ) {
      return [...priorityItems.slice(0, 2), currentSection];
    }

    return priorityItems;
  }, [currentSection, menuItems]);
  const primaryRole = formatRole(userRoles[0] ?? "");
  const accountInitials = getInitials(user?.name);
  const isMoreCurrent = Boolean(
    currentSection && !mobileQuickItems.some((item) => item.path === currentSection.path),
  );

  function isActive(path: string): boolean {
    return currentSection?.path === path;
  }

  function toggleSidebar() {
    setIsSidebarCollapsed((current) => {
      const nextState = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextState));
      return nextState;
    });
  }

  async function handleLogout() {
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
    await logout();
  }

  const shellClassName = `${styles.appShell}${
    isSidebarCollapsed ? ` ${styles.appShellCollapsed}` : ""
  }${isMobileMenuOpen ? ` ${styles.appShellMobileOpen}` : ""}`;

  return (
    <>
      <a className={styles.skipLink} href="#conteudo-principal">
        Pular para o conteúdo
      </a>

      <div className={shellClassName}>
        <aside
          ref={sidebarRef}
          id="main-navigation"
          className={styles.sidebar}
          aria-label="Navegação principal"
          aria-hidden={isMobileViewport && !isMobileMenuOpen ? true : undefined}
          inert={isMobileViewport && !isMobileMenuOpen ? true : undefined}
        >
          <div className={styles.sidebarHeader}>
            <ShellBrand />
            <button
              className={styles.mobileClose}
              type="button"
              aria-label="Fechar menu"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <nav className={styles.sidebarNav} aria-label="Seções do sistema">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-current={isActive(item.path) ? "page" : undefined}
                aria-label={isSidebarCollapsed && !isMobileViewport ? item.label : undefined}
                title={isSidebarCollapsed && !isMobileViewport ? item.label : undefined}
                className={`${styles.navLink}${
                  isActive(item.path) ? ` ${styles.navLinkActive}` : ""
                }`}
              >
                <AppIcon name={item.icon} className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className={styles.sidebarFooter}>
            <div className={styles.purpose}>
              <Heart size={23} aria-hidden="true" />
              <span>Transformando doações em oportunidades.</span>
            </div>
            <button
              className={styles.collapseButton}
              type="button"
              aria-label={
                isSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"
              }
              title={isSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              onClick={toggleSidebar}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen size={18} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={18} aria-hidden="true" />
              )}
            </button>
          </div>
        </aside>

        {isMobileViewport ? (
          <button
            className={styles.drawerBackdrop}
            type="button"
            aria-label="Fechar menu"
            tabIndex={isMobileMenuOpen ? 0 : -1}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        ) : null}

        <main id="conteudo-principal" className={styles.content} tabIndex={-1}>
          <header className={styles.topbar}>
            <div className={styles.topbarIdentity}>
              <button
                ref={navigationToggleRef}
                className={styles.mobileMenuButton}
                type="button"
                aria-label="Abrir menu"
                aria-controls="main-navigation"
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu size={21} aria-hidden="true" />
              </button>
              <div className={styles.mobileBrand}>
                <ShellBrand compact />
              </div>
              <span className={styles.sectionTitle}>
                {currentSection?.label ?? routeMeta.title}
              </span>
            </div>

            <div ref={accountRef} className={styles.account}>
              <button
                className={styles.accountButton}
                type="button"
                aria-label={`Conta de ${user?.name ?? "Usuário"}`}
                aria-haspopup="menu"
                aria-expanded={isAccountMenuOpen}
                onClick={() => setIsAccountMenuOpen((current) => !current)}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {accountInitials}
                </span>
                <span className={styles.accountText}>
                  <strong>{user?.name ?? "Usuário"}</strong>
                  <span>{primaryRole}</span>
                </span>
                <ChevronDown className={styles.accountChevron} size={17} aria-hidden="true" />
              </button>

              {isAccountMenuOpen ? (
                <div className={styles.accountMenu} role="menu">
                  <div className={styles.accountMenuHeader}>
                    <UserRound size={18} aria-hidden="true" />
                    <div>
                      <strong>{user?.name ?? "Usuário"}</strong>
                      <span>
                        {user?.login_name ? `@${user.login_name}` : primaryRole}
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.accountMenuItem}
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <AppIcon name="logout" className={styles.accountMenuIcon} />
                    <span>Sair</span>
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          <section className={styles.pageContent}>
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

        <nav className={styles.bottomNav} aria-label="Atalhos principais">
          {mobileQuickItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive(item.path) ? "page" : undefined}
              className={`${styles.bottomNavItem}${
                isActive(item.path) ? ` ${styles.bottomNavItemActive}` : ""
              }`}
            >
              <AppIcon name={item.icon} className={styles.bottomNavIcon} />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            className={`${styles.bottomNavItem}${
              isMoreCurrent ? ` ${styles.bottomNavItemActive}` : ""
            }`}
            type="button"
            aria-label="Mais opções"
            aria-current={isMoreCurrent ? "page" : undefined}
            aria-controls="main-navigation"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className={styles.bottomNavIcon} aria-hidden="true" />
            <span>Menu</span>
          </button>
        </nav>
      </div>
    </>
  );
}
