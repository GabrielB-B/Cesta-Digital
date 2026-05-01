import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Pagina nao encontrada</p>
          <h2>Este caminho nao existe</h2>
          <p className="hero-card__description">
            Confira o endereco digitado ou volte para o dashboard para seguir a
            operacao.
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
