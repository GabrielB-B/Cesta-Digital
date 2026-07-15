import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { DataTable } from "../components/DataTable";
import { MetricGrid } from "../components/MetricGrid";
import { PageHeader } from "../components/PageHeader";
import { PanelHeader } from "../components/PanelHeader";
import { PaginationControls } from "../components/PaginationControls";
import { StateMessage } from "../components/StateMessage";
import type { StockSummaryResponse } from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";

const PAGE_SIZE = 25;

export function ItemsPage() {
  const [items, setItems] = useState<StockSummaryResponse[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadItems(
    nextOffset = offset,
    nextSearch = search,
    nextActiveFilter = activeFilter
  ) {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.get<StockSummaryResponse[]>("/stock-summary", {
        params: {
          q: nextSearch.trim() || undefined,
          is_active:
            nextActiveFilter === ""
              ? undefined
              : nextActiveFilter === "true",
          limit: PAGE_SIZE,
          offset: nextOffset,
        },
      });

      setItems(response.data);
      setTotal(Number(response.headers["x-total-count"] ?? response.data.length));
      setOffset(nextOffset);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar os itens."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialItems() {
      try {
        const response = await api.get<StockSummaryResponse[]>(
          "/stock-summary",
          {
            params: {
              limit: PAGE_SIZE,
              offset: 0,
            },
          }
        );

        if (isMounted) {
          setItems(response.data);
          setTotal(
            Number(response.headers["x-total-count"] ?? response.data.length)
          );
          setOffset(0);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            getApiErrorMessage(err, "Não foi possível carregar os itens.")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialItems();

    return () => {
      isMounted = false;
    };
  }, []);

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

  async function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadItems(0);
  }

  function handleClearFilters() {
    setSearch("");
    setActiveFilter("");
    void loadItems(0, "", "");
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Estoque"
        title="Itens"
        description="Acompanhe o catálogo operacional com filtros e paginação executados no backend."
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
            description: "Nesta página.",
          },
          {
            title: "Abaixo do mínimo",
            value: summary.belowMinimum,
            description: "Nesta página.",
          },
          {
            title: "Controlam validade",
            value: summary.withExpiration,
            description: "Nesta página.",
          },
        ]}
      />

      <section className="panel-card">
        <PanelHeader
          eyebrow="Consulta"
          title="Catálogo operacional"
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
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </label>

            <button type="submit" className="button" disabled={isLoading}>
              {isLoading ? "Consultando…" : "Aplicar"}
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
          <StateMessage variant="loading">Carregando itens…</StateMessage>
        ) : error ? (
          <StateMessage variant="error">{error}</StateMessage>
        ) : items.length === 0 ? (
          <StateMessage>
            Nenhum item encontrado para o filtro informado.
          </StateMessage>
        ) : (
          <>
            <DataTable caption="Catálogo operacional de itens">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoria</th>
                  <th>Unidade</th>
                  <th>Quantidade</th>
                  <th>Mínimo</th>
                  <th>Lotes</th>
                  <th>Validade</th>
                  <th>Status</th>
                  <th>Ações</th>
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
                        <span className="pill">Não controla</span>
                      )}
                    </td>
                    <td>
                      {!item.is_active ? (
                        <span className="pill">Inativo</span>
                      ) : item.is_below_minimum ? (
                        <span className="pill pill--danger">Atenção</span>
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
              offset={offset}
              limit={PAGE_SIZE}
              isLoading={isLoading}
              onPageChange={(nextOffset) => void loadItems(nextOffset)}
            />
          </>
        )}
      </section>
    </div>
  );
}
