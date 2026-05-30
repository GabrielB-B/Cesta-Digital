import { Link } from "react-router-dom";

interface AccessDeniedPageProps {
  allowedRoles?: string[];
}

function formatRole(role: string): string {
  if (role === "admin") {
    return "Administrador";
  }

  if (role === "lider_social") {
    return "Lideranca social";
  }

  if (role === "operador") {
    return "Operador";
  }

  return role;
}

export function AccessDeniedPage({ allowedRoles = [] }: AccessDeniedPageProps) {
  const requiredRoles = allowedRoles.map(formatRole).join(", ");

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Acesso restrito</p>
          <h2>Acesso restrito</h2>
          <p className="hero-card__description">
            Esta area e exclusiva para administradores do sistema.
            {requiredRoles ? ` Perfis autorizados: ${requiredRoles}.` : ""}
          </p>
        </div>
      </section>

      <div className="panel-actions">
        <Link to="/" className="button button--secondary button--link">
          Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
