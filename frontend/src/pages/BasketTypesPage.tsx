import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { PaginationControls } from "../components/PaginationControls";
import type { BasketTypeResponse } from "../types/basket";
import { getApiErrorMessage } from "../utils/api-error";

const PAGE_SIZE = 25;

export function BasketTypesPage() {
  const [basketTypes, setBasketTypes] = useState<BasketTypeResponse[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBasketTypes(nextOffset = offset) {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.get<BasketTypeResponse[]>("/basket-types", {
        params: {
          q: search.trim() || undefined,
          is_active: activeFilter === "" ? undefined : activeFilter === "true",
          limit: PAGE_SIZE,
          offset: nextOffset,
        },
      });

      setBasketTypes(response.data);
      setTotal(Number(response.headers["x-total-count"] ?? response.data.length));
      setOffset(nextOffset);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel carregar os tipos de cesta."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBasketTypes(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    return {
      total,
      active: basketTypes.filter((basketType) => basketType.is_active).length,
      inactive: basketTypes.filter((basketType) => !basketType.is_active).length,
    };
  }, [basketTypes, total]);

  async function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadBasketTypes(0);
  }

  function handleClearFilters() {
    setSearch("");
    setActiveFilter("");
    setTimeout(() => void loadBasketTypes(0), 0);
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Cestas</p>
          <h2>Tipos de cesta</h2>
          <p className="hero-card__description">
            Consulte modelos de cesta com filtros server-side e paginacao para
            crescimento da operacao.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card__title">Resultado filtrado</p>
          <strong className="stat-card__value">{summary.total}</strong>
          <span className="stat-card__description">Modelos encontrados.</span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Ativos</p>
          <strong className="stat-card__value">{summary.active}</strong>
          <span className="stat-card__description">Nesta pagina.</span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Inativos</p>
          <strong className="stat-card__value">{summary.inactive}</strong>
          <span className="stat-card__description">Nesta pagina.</span>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-card__header panel-card__header--stack">
          <div>
            <p className="eyebrow">Consulta</p>
            <h3>Modelos de cesta</h3>
          </div>

          <form className="toolbar toolbar--row" onSubmit={handleApplyFilters}>
            <input
              className="toolbar__input"
              type="text"
              placeholder="Buscar por nome ou observacao"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className="toolbar__input toolbar__input--select"
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>

            <button type="submit" className="button" disabled={isLoading}>
              {isLoading ? "Consultando..." : "Aplicar"}
            </button>

            <button
              type="button"
              className="button button--secondary"
              onClick={handleClearFilters}
              disabled={isLoading}
            >
              Limpar
            </button>

            <Link to="/basket-types/new" className="button button--link">
              Novo tipo
            </Link>
          </form>
        </div>

        {isLoading ? (
          <p className="empty-state">Carregando tipos de cesta...</p>
        ) : error ? (
          <p className="status-error">{error}</p>
        ) : basketTypes.length === 0 ? (
          <p className="empty-state">
            Nenhum tipo de cesta encontrado para o filtro informado.
          </p>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Status</th>
                    <th>Observacoes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {basketTypes.map((basketType) => (
                    <tr key={basketType.id}>
                      <td>{basketType.name}</td>
                      <td>
                        {basketType.is_active ? (
                          <span className="pill pill--success">Ativa</span>
                        ) : (
                          <span className="pill">Inativa</span>
                        )}
                      </td>
                      <td>{basketType.notes || "Sem observacoes"}</td>
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

            <PaginationControls
              total={total}
              offset={offset}
              limit={PAGE_SIZE}
              isLoading={isLoading}
              onPageChange={(nextOffset) => void loadBasketTypes(nextOffset)}
            />
          </>
        )}
      </section>
    </div>
  );
}
