import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { FamilyListItemResponse } from "../types/family";

/**
 * Lista real de famílias com filtros simples para a operação diária.
 */
export function FamiliesPage() {
  const [families, setFamilies] = useState<FamilyListItemResponse[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFamilies() {
      try {
        setIsLoading(true);
        setError("");

        const response = await api.get<FamilyListItemResponse[]>("/families");

        if (isMounted) {
          setFamilies(response.data);
        }
      } catch {
        if (isMounted) {
          setError("Não foi possível carregar as famílias.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadFamilies();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredFamilies = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) {
      return families;
    }

    return families.filter((family) => {
      return (
        family.internal_code.toLowerCase().includes(searchTerm) ||
        family.city.toLowerCase().includes(searchTerm) ||
        family.status.toLowerCase().includes(searchTerm)
      );
    });
  }, [families, search]);

  const summary = useMemo(() => {
    return {
      total: families.length,
      recurring: families.filter((family) => family.status === "apta_recorrente")
        .length,
      emergency: families.filter(
        (family) => family.status === "apta_emergencial"
      ).length,
      underReview: families.filter((family) => family.status === "em_analise")
        .length,
    };
  }, [families]);

  function formatCurrency(value: string): string {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Módulo social</p>
          <h2>Famílias</h2>
          <p className="hero-card__description">
            Consulte rapidamente as famílias cadastradas, o status social e os
            indicadores básicos para acompanhamento.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card__title">Total</p>
          <strong className="stat-card__value">{summary.total}</strong>
          <span className="stat-card__description">
            Famílias cadastradas no sistema.
          </span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Aptas recorrentes</p>
          <strong className="stat-card__value">{summary.recurring}</strong>
          <span className="stat-card__description">
            Apoio recorrente aprovado.
          </span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Aptas emergenciais</p>
          <strong className="stat-card__value">{summary.emergency}</strong>
          <span className="stat-card__description">
            Apoio emergencial aprovado.
          </span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Em análise</p>
          <strong className="stat-card__value">{summary.underReview}</strong>
          <span className="stat-card__description">
            Aguardando definição social.
          </span>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-card__header panel-card__header--stack">
          <div>
            <p className="eyebrow">Consulta</p>
            <h3>Famílias cadastradas</h3>
          </div>

          <div className="toolbar toolbar--row">
            <input
              className="toolbar__input"
              type="text"
              placeholder="Buscar por código, cidade ou status"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <Link to="/families/new" className="button button--link">
              Nova família
            </Link>
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">Carregando famílias...</p>
        ) : error ? (
          <p className="status-error">{error}</p>
        ) : filteredFamilies.length === 0 ? (
          <p className="empty-state">
            Nenhuma família encontrada para o filtro informado.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Status</th>
                  <th>Cidade</th>
                  <th>Moradores</th>
                  <th>Renda per capita</th>
                  <th>Contato principal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredFamilies.map((family) => (
                  <tr key={family.id}>
                    <td>{family.internal_code}</td>
                    <td>
                      <span className="pill">{family.status}</span>
                    </td>
                    <td>
                      {family.city}/{family.state}
                    </td>
                    <td>{family.total_residents}</td>
                    <td>{formatCurrency(family.income_per_capita)}</td>
                    <td>{family.contacts[0]?.contact_name ?? "Sem contato"}</td>
                    <td>
                      <Link
                        to={`/families/${family.id}`}
                        className="table-link"
                      >
                        Ver detalhe
                      </Link>
                    </td>
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