import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { BasketTypeResponse } from "../types/basket";

/**
 * Lista real dos tipos de cesta cadastrados no sistema.
 */
export function BasketTypesPage() {
  const [basketTypes, setBasketTypes] = useState<BasketTypeResponse[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadBasketTypes() {
      try {
        setIsLoading(true);
        setError("");

        const response = await api.get<BasketTypeResponse[]>("/basket-types");

        if (isMounted) {
          setBasketTypes(response.data);
        }
      } catch {
        if (isMounted) {
          setError("Não foi possível carregar os tipos de cesta.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBasketTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredBasketTypes = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return basketTypes;
    }

    return basketTypes.filter((basketType) => {
      return (
        basketType.name.toLowerCase().includes(term) ||
        (basketType.is_active ? "ativa" : "inativa").includes(term)
      );
    });
  }, [basketTypes, search]);

  const summary = useMemo(() => {
    return {
      total: basketTypes.length,
      active: basketTypes.filter((basketType) => basketType.is_active).length,
      inactive: basketTypes.filter((basketType) => !basketType.is_active).length,
    };
  }, [basketTypes]);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Cestas</p>
          <h2>Tipos de cesta</h2>
          <p className="hero-card__description">
            Consulte os tipos de cesta ativos no sistema e acompanhe sua
            estrutura de receita.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card__title">Tipos cadastrados</p>
          <strong className="stat-card__value">{summary.total}</strong>
          <span className="stat-card__description">
            Modelos de cesta registrados.
          </span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Ativos</p>
          <strong className="stat-card__value">{summary.active}</strong>
          <span className="stat-card__description">
            Tipos de cesta disponíveis para operação.
          </span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Inativos</p>
          <strong className="stat-card__value">{summary.inactive}</strong>
          <span className="stat-card__description">
            Tipos desativados no sistema.
          </span>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-card__header panel-card__header--stack">
          <div>
            <p className="eyebrow">Consulta</p>
            <h3>Modelos de cesta</h3>
          </div>

          <div className="toolbar">
            <div className="toolbar toolbar--row">
              <input
                className="toolbar__input"
                type="text"
                placeholder="Buscar por nome ou status"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <Link to="/basket-types/new" className="button button--link">
                Novo tipo
              </Link>
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">Carregando tipos de cesta...</p>
        ) : error ? (
          <p className="status-error">{error}</p>
        ) : filteredBasketTypes.length === 0 ? (
          <p className="empty-state">
            Nenhum tipo de cesta encontrado para o filtro informado.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Status</th>
                  <th>Observações</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredBasketTypes.map((basketType) => (
                  <tr key={basketType.id}>
                    <td>{basketType.name}</td>
                    <td>
                      {basketType.is_active ? (
                        <span className="pill pill--success">Ativa</span>
                      ) : (
                        <span className="pill">Inativa</span>
                      )}
                    </td>
                    <td>{basketType.notes || "Sem observações"}</td>
                    <td>
                      <Link
                        to={`/basket-types/${basketType.id}`}
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
