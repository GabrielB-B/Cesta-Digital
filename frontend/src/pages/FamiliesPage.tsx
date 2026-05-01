import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { PaginationControls } from "../components/PaginationControls";
import type { FamilyListItemResponse } from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";

const PAGE_SIZE = 25;

const familyStatusOptions = [
  { value: "", label: "Todos os status" },
  { value: "apta_recorrente", label: "Apta recorrente" },
  { value: "apta_emergencial", label: "Apta emergencial" },
  { value: "em_analise", label: "Em analise" },
  { value: "inapta", label: "Inapta" },
  { value: "inativa", label: "Inativa" },
];

function formatCurrency(value: string): string {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatStatus(status: string): string {
  return (
    familyStatusOptions.find((option) => option.value === status)?.label ?? status
  );
}

export function FamiliesPage() {
  const [families, setFamilies] = useState<FamilyListItemResponse[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadFamilies(nextOffset = offset) {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.get<FamilyListItemResponse[]>("/families", {
        params: {
          q: search.trim() || undefined,
          status: status || undefined,
          limit: PAGE_SIZE,
          offset: nextOffset,
        },
      });

      setFamilies(response.data);
      setTotal(Number(response.headers["x-total-count"] ?? response.data.length));
      setOffset(nextOffset);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel carregar as familias."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadFamilies(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    return {
      total,
      recurring: families.filter((family) => family.status === "apta_recorrente")
        .length,
      emergency: families.filter(
        (family) => family.status === "apta_emergencial"
      ).length,
      underReview: families.filter((family) => family.status === "em_analise")
        .length,
    };
  }, [families, total]);

  async function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadFamilies(0);
  }

  function handleClearFilters() {
    setSearch("");
    setStatus("");
    setTimeout(() => void loadFamilies(0), 0);
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Modulo social</p>
          <h2>Familias</h2>
          <p className="hero-card__description">
            Consulte familias por busca e status direto no servidor, com
            paginacao para bases maiores.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card__title">Resultado filtrado</p>
          <strong className="stat-card__value">{summary.total}</strong>
          <span className="stat-card__description">
            Familias encontradas na consulta atual.
          </span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Aptas recorrentes</p>
          <strong className="stat-card__value">{summary.recurring}</strong>
          <span className="stat-card__description">Nesta pagina.</span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Aptas emergenciais</p>
          <strong className="stat-card__value">{summary.emergency}</strong>
          <span className="stat-card__description">Nesta pagina.</span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Em analise</p>
          <strong className="stat-card__value">{summary.underReview}</strong>
          <span className="stat-card__description">Nesta pagina.</span>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-card__header panel-card__header--stack">
          <div>
            <p className="eyebrow">Consulta</p>
            <h3>Familias cadastradas</h3>
          </div>

          <form className="toolbar toolbar--row" onSubmit={handleApplyFilters}>
            <input
              className="toolbar__input"
              type="text"
              placeholder="Buscar por codigo, cidade, bairro ou status"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className="toolbar__input toolbar__input--select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {familyStatusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
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

            <Link to="/families/new" className="button button--link">
              Nova familia
            </Link>
          </form>
        </div>

        {isLoading ? (
          <p className="empty-state">Carregando familias...</p>
        ) : error ? (
          <p className="status-error" role="alert" aria-live="polite">
            {error}
          </p>
        ) : families.length === 0 ? (
          <p className="empty-state">
            Nenhuma familia encontrada para o filtro informado.
          </p>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Status</th>
                    <th>Cidade</th>
                    <th>Moradores</th>
                    <th>Renda per capita</th>
                    <th>Contato principal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {families.map((family) => (
                    <tr key={family.id}>
                      <td>{family.internal_code}</td>
                      <td>
                        <span className="pill">{formatStatus(family.status)}</span>
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

            <PaginationControls
              total={total}
              offset={offset}
              limit={PAGE_SIZE}
              isLoading={isLoading}
              onPageChange={(nextOffset) => void loadFamilies(nextOffset)}
            />
          </>
        )}
      </section>
    </div>
  );
}
