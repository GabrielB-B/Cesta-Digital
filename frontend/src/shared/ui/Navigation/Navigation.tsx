import type { MouseEvent, ReactNode } from "react";
import styles from "./Navigation.module.css";

export interface NavigationItem {
  label: string;
  href: string;
  icon: ReactNode;
  current?: boolean;
  onSelect?: () => void;
}

interface NavigationProps {
  items: NavigationItem[];
  onBrandSelect?: () => void;
}

function NavigationLink({ item, compact = false }: { item: NavigationItem; compact?: boolean }) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!item.onSelect) return;
    event.preventDefault();
    item.onSelect();
  };

  return (
    <a
      aria-current={item.current ? "page" : undefined}
      className={`${styles.link} ${item.current ? styles.current : ""} ${compact ? styles.compact : ""}`}
      href={item.href}
      onClick={handleClick}
    >
      <span className={styles.icon} aria-hidden="true">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </a>
  );
}

export function SideNavigation({ items, onBrandSelect }: NavigationProps) {
  const handleBrandClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onBrandSelect) return;
    event.preventDefault();
    onBrandSelect();
  };

  return (
    <aside className={styles.sidebar}>
      <a
        className={styles.brand}
        href="#visao-geral"
        aria-label="Cesta Digital, início"
        onClick={handleBrandClick}
      >
        <img src="/brand/cesta-digital-symbol.png" alt="" />
        <span>
          <strong>Cesta Digital</strong>
          <small>Gestão humanitária</small>
        </span>
      </a>
      <nav className={styles.sideNav} aria-label="Navegação principal">
        <p className={styles.groupLabel}>Operação</p>
        {items.map((item) => (
          <NavigationLink item={item} key={item.label} />
        ))}
      </nav>
    </aside>
  );
}

export function BottomNavigation({ items }: NavigationProps) {
  return (
    <nav className={styles.bottomNav} aria-label="Navegação principal móvel">
      {items.slice(0, 4).map((item) => (
        <NavigationLink compact item={item} key={item.label} />
      ))}
    </nav>
  );
}
