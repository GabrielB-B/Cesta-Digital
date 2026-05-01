import { Link } from "react-router-dom";

interface AccessDeniedPageProps {
  allowedRoles?: string[];
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

  return role;
}

export function AccessDeniedPage({ allowedRoles = [] }: AccessDeniedPageProps) {
  const requiredRoles = allowedRoles.map(formatRole).join(", ");

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Acesso restrito</p>
          <h2>Sem permissao para este modulo</h2>
          <p className="hero-card__description">
            Seu perfil atual nao possui acesso a esta area do Cesta Digital.
            {requiredRoles ? ` Perfis autorizados: ${requiredRoles}.` : ""}
          </p>
        </div>
      </section>

      <div className="panel-actions">
        <Link to="/" className="button button--secondary button--link">
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}
