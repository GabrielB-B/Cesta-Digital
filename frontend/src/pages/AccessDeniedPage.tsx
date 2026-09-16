import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "./SystemStatePage.module.css";

interface AccessDeniedPageProps {
  allowedRoles?: readonly string[];
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

  return role;
}

export function AccessDeniedPage({ allowedRoles = [] }: AccessDeniedPageProps) {
  const requiredRoles = allowedRoles.map(formatRole).join(", ");

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="access-denied-title">
        <span className={styles.icon} aria-hidden="true"><ShieldAlert /></span>
        <p className={styles.eyebrow}>Acesso restrito</p>
        <h1 id="access-denied-title">Acesso restrito</h1>
        <p className={styles.description}>
          {requiredRoles
            ? `Esta área está disponível para: ${requiredRoles}.`
            : "Seu perfil não possui a permissão necessária."}
        </p>
        <Link to="/" className={styles.action}>Voltar ao painel</Link>
      </section>
    </main>
  );
}
