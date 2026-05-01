import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { DataTable } from "../components/DataTable";
import { MetricGrid } from "../components/MetricGrid";
import { PageHeader } from "../components/PageHeader";
import { PanelHeader } from "../components/PanelHeader";
import { PaginationControls } from "../components/PaginationControls";
import { StateMessage } from "../components/StateMessage";
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
      <PageHeader
        eyebrow="Cestas"
        title="Tipos de cesta"
        description="Consulte modelos de cesta com filtros server-side e paginacao para crescimento da operacao."
      />

      <MetricGrid
        items={[
          {
            title: "Resultado filtrado",
            value: summary.total,
            description: "Modelos encontrados.",
          },
          {
            title: "Ativos",
            value: summary.active,
            description: "Nesta pagina.",
          },
          {
            title: "Inativos",
            value: summary.inactive,
            description: "Nesta pagina.",
          },
        ]}
      />

      <section className="panel-card">
        <PanelHeader
          eyebrow="Consulta"
          title="Modelos de cesta"
          stacked
          actions={
            <form className="toolbar toolbar--row" onSubmit={handleApplyFilters}>
            <label className="toolbar__field">
              <span className="sr-only">Buscar tipos de cesta</span>
              <input
                className="toolbar__input"
                type="text"
                name="basket_types_search"
                placeholder="Buscar por nome ou observacao..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            <label className="toolbar__field toolbar__field--select">
              <span className="sr-only">Filtrar tipos de cesta por status</span>
              <select
                className="toolbar__input toolbar__input--select"
                name="basket_types_status"
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </label>

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
          }
        />

        {isLoading ? (
          <StateMessage variant="loading">
            Carregando tipos de cesta...
          </StateMessage>
        ) : error ? (
          <StateMessage variant="error">{error}</StateMessage>
        ) : basketTypes.length === 0 ? (
          <StateMessage>
            Nenhum tipo de cesta encontrado para o filtro informado.
          </StateMessage>
        ) : (
          <>
            <DataTable caption="Modelos de cesta cadastrados">
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
            </DataTable>

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
