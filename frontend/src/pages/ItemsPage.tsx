import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { DataTable } from "../components/DataTable";
import { MetricGrid } from "../components/MetricGrid";
import { PageHeader } from "../components/PageHeader";
import { PaginationControls } from "../components/PaginationControls";
import { PanelHeader } from "../components/PanelHeader";
import { StateMessage } from "../components/StateMessage";
import type { StockSummaryResponse } from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";
import {
  buildListSearchParams,
  getQueryOffset,
  getQueryText,
} from "../utils/list-query";

const PAGE_SIZE = 25;

export function ItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSearch = getQueryText(searchParams, "q");
  const activeFilter = getQueryText(searchParams, "active");
  const activeOffset = getQueryOffset(searchParams);
  const [items, setItems] = useState<StockSummaryResponse[]>([]);
  const [search, setSearch] = useState(activeSearch);
  const [statusDraft, setStatusDraft] = useState(activeFilter);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      try {
        setSearch(activeSearch);
        setStatusDraft(activeFilter);
        setIsLoading(true);
        setError("");

        const response = await api.get<StockSummaryResponse[]>("/stock-summary", {
          params: {
            q: activeSearch || undefined,
            is_active: activeFilter === "" ? undefined : activeFilter === "true",
            limit: PAGE_SIZE,
            offset: activeOffset,
          },
        });

        if (!isMounted) {
          return;
        }

        setItems(response.data);
        setTotal(Number(response.headers["x-total-count"] ?? response.data.length));
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, "Nao foi possivel carregar os itens."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadItems();

    return () => {
      isMounted = false;
    };
  }, [activeFilter, activeOffset, activeSearch]);

  const summary = useMemo(() => {
    return {
      total,
      belowMinimum: items.filter(
        (item) => item.is_active && item.is_below_minimum
      ).length,
      active: items.filter((item) => item.is_active).length,
      withExpiration: items.filter((item) => item.tracks_expiration).length,
    };
  }, [items, total]);

  function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, {
        q: search.trim(),
        active: statusDraft,
        offset: null,
      })
    );
  }

  function handleClearFilters() {
    setSearch("");
    setStatusDraft("");
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, {
        q: null,
        active: null,
        offset: null,
      })
    );
  }

  function handlePageChange(nextOffset: number) {
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, { offset: nextOffset || null })
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Estoque"
        title="Itens"
        description="Acompanhe o catalogo operacional com filtros e paginacao executados no backend."
        actions={
          <Link to="/stock-batches/new" className="button button--link">
            Registrar entrada
          </Link>
        }
      />

      <MetricGrid
        items={[
          {
            title: "Resultado filtrado",
            value: summary.total,
            description: "Itens encontrados.",
          },
          {
            title: "Itens ativos",
            value: summary.active,
            description: "Nesta pagina.",
          },
          {
            title: "Abaixo do minimo",
            value: summary.belowMinimum,
            description: "Nesta pagina.",
          },
          {
            title: "Controlam validade",
            value: summary.withExpiration,
            description: "Nesta pagina.",
          },
        ]}
      />

      <section className="panel-card">
        <PanelHeader
          eyebrow="Consulta"
          title="Catalogo operacional"
          stacked
          actions={
            <form className="toolbar toolbar--row" onSubmit={handleApplyFilters}>
              <label className="toolbar__field">
                <span className="sr-only">Buscar itens</span>
                <input
                  className="toolbar__input"
                  type="text"
                  name="items_search"
                  placeholder="Buscar por item, categoria ou unidade..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>

              <label className="toolbar__field toolbar__field--select">
                <span className="sr-only">Filtrar itens por status</span>
                <select
                  className="toolbar__input toolbar__input--select"
                  name="items_status"
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value)}
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

              <Link to="/items/new" className="button button--link">
                Novo item
              </Link>

              <Link
                to="/item-categories"
                className="button button--secondary button--link"
              >
                Categorias
              </Link>
            </form>
          }
        />

        {isLoading ? (
          <StateMessage variant="loading">Carregando itens...</StateMessage>
        ) : error ? (
          <StateMessage variant="error">{error}</StateMessage>
        ) : items.length === 0 ? (
          <StateMessage>
            Nenhum item encontrado para o filtro informado.
          </StateMessage>
        ) : (
          <>
            <DataTable caption="Catalogo operacional de itens">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoria</th>
                  <th>Unidade</th>
                  <th>Quantidade</th>
                  <th>Minimo</th>
                  <th>Lotes</th>
                  <th>Validade</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.item_id}>
                    <td>{item.item_name}</td>
                    <td>{item.category_name}</td>
                    <td>{item.unit_measure}</td>
                    <td>{item.total_quantity}</td>
                    <td>{item.minimum_stock_alert}</td>
                    <td>{item.total_batches}</td>
                    <td>
                      {item.tracks_expiration ? (
                        <span className="pill pill--primary">Por lote</span>
                      ) : (
                        <span className="pill">Nao controla</span>
                      )}
                    </td>
                    <td>
                      {!item.is_active ? (
                        <span className="pill">Inativo</span>
                      ) : item.is_below_minimum ? (
                        <span className="pill pill--danger">Atencao</span>
                      ) : (
                        <span className="pill pill--success">Ativo</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        {item.is_active ? (
                          <Link
                            to={`/stock-batches/new?itemId=${item.item_id}`}
                            className="table-link"
                          >
                            Registrar entrada
                          </Link>
                        ) : null}
                        <Link
                          to={`/items/${item.item_id}`}
                          className="table-link"
                        >
                          Ver detalhe
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>

            <PaginationControls
              total={total}
              offset={activeOffset}
              limit={PAGE_SIZE}
              isLoading={isLoading}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </section>
    </div>
  );
}
