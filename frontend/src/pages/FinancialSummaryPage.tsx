import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { FinancialSummaryResponse } from "../types/financial";
import { getApiErrorMessage } from "../utils/api-error";

function formatCurrency(value: string): string {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Painel financeiro estimado para prestação de contas.
 */
export function FinancialSummaryPage() {
  const [summary, setSummary] = useState<FinancialSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        setIsLoading(true);
        setError("");
        const response = await api.get<FinancialSummaryResponse>(
          "/financial-summary"
        );

        if (isMounted) {
          setSummary(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              err,
              "Não foi possível carregar o resumo financeiro."
            )
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <p className="empty-state">Carregando resumo financeiro...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <p className="status-error">
            {error || "Não foi possível carregar os dados financeiros."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Prestação de contas</p>
          <h2>Resumo financeiro estimado</h2>
          <p className="hero-card__description">
            Acompanhe entradas, saídas e valor estimado em estoque para apoiar
            decisões operacionais e relatórios.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card__title">Estoque atual</p>
          <strong className="stat-card__value">
            {formatCurrency(summary.estimated_total_stock_value)}
          </strong>
          <span className="stat-card__description">
            Valor estimado do saldo atual em estoque.
          </span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Entradas acumuladas</p>
          <strong className="stat-card__value">
            {formatCurrency(summary.estimated_total_entries_value)}
          </strong>
          <span className="stat-card__description">
            Valor estimado de tudo que entrou no estoque.
          </span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Saídas acumuladas</p>
          <strong className="stat-card__value">
            {formatCurrency(summary.estimated_total_output_value)}
          </strong>
          <span className="stat-card__description">
            Valor estimado de consumo e baixas.
          </span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Benefícios ativos</p>
          <strong className="stat-card__value">
            {formatCurrency(summary.active_benefits_total_value)}
          </strong>
          <span className="stat-card__description">
            Soma mensal dos benefícios ativos cadastrados.
          </span>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Categorias</p>
            <h3>Distribuição estimada por categoria</h3>
          </div>
        </div>

        {summary.categories.length === 0 ? (
          <p className="empty-state">
            Nenhuma categoria com valor estimado disponível.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Valor estimado</th>
                </tr>
              </thead>
              <tbody>
                {summary.categories.map((category) => (
                  <tr key={category.category_id}>
                    <td>{category.category_name}</td>
                    <td>{formatCurrency(category.estimated_stock_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
