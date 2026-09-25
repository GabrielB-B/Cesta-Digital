import { ScrollText, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "../pages/AdministrationPage.module.css";

export type AdministrationSection = "users" | "roles" | "audit";

type AdministrationShellProps = {
  activeSection: AdministrationSection;
  children: React.ReactNode;
  aside: React.ReactNode;
};

const sections = [
  { key: "users", label: "Usuários", to: "/users", icon: UsersRound },
  { key: "roles", label: "Perfis", to: "/users?view=roles", icon: ShieldCheck },
  { key: "audit", label: "Auditoria", to: "/audit-logs", icon: ScrollText },
] as const;

export function AdministrationShell({
  activeSection,
  children,
  aside,
}: AdministrationShellProps) {
  return (
    <main className={styles.page} aria-labelledby="administration-title">
      <header className={styles.pageHeader}>
        <h1 id="administration-title">Administração</h1>
        <p>Gerencie acessos, perfis e registros de segurança do Cesta Digital.</p>
      </header>

      <section className={styles.frame}>
        <nav className={styles.sectionNav} aria-label="Seções administrativas">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.key}
                to={section.to}
                className={`${styles.sectionLink}${
                  activeSection === section.key ? ` ${styles.sectionLinkActive}` : ""
                }`}
                aria-current={activeSection === section.key ? "page" : undefined}
              >
                <Icon aria-hidden="true" />
                <span>{section.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.mainPanel}>{children}</div>
        <aside className={styles.aside}>{aside}</aside>
      </section>
    </main>
  );
}
