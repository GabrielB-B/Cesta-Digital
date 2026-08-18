import type { ReactNode } from "react";
import styles from "./Navigation.module.css";

export interface NavigationItem {
  label: string;
  href: string;
  icon: ReactNode;
  current?: boolean;
}

interface NavigationProps {
  items: NavigationItem[];
}

function NavigationLink({ item, compact = false }: { item: NavigationItem; compact?: boolean }) {
  return (
    <a
      aria-current={item.current ? "page" : undefined}
      className={`${styles.link} ${item.current ? styles.current : ""} ${compact ? styles.compact : ""}`}
      href={item.href}
    >
      <span className={styles.icon} aria-hidden="true">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </a>
  );
}

export function SideNavigation({ items }: NavigationProps) {
  return (
    <aside className={styles.sidebar}>
      <a className={styles.brand} href="#inicio" aria-label="Cesta Digital, início">
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
      <div className={styles.profile}>
        <span className={styles.avatar} aria-hidden="true">
          ML
        </span>
        <span>
          <strong>Marina Lima</strong>
          <small>Líder social</small>
        </span>
      </div>
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
