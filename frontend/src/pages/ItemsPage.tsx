import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { StockSummaryResponse } from "../types/item";

/**
 * Lista operacional de itens com visão consolidada de estoque.
 */
export function ItemsPage() {
  const [items, setItems] = useState<StockSummaryResponse[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      try {
        setIsLoading(true);
        setError("");

        const response = await api.get<StockSummaryResponse[]>("/stock-summary");

        if (isMounted) {
          setItems(response.data);
        }
      } catch {
        if (isMounted) {
          setError("Não foi possível carregar os itens.");
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
  }, []);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.item_name.toLowerCase().includes(term) ||
        item.category_name.toLowerCase().includes(term) ||
        item.unit_measure.toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      belowMinimum: items.filter((item) => item.is_below_minimum).length,
      active: items.filter((item) => item.is_active).length,
      withExpiration: items.filter((item) => item.tracks_expiration).length,
    };
  }, [items]);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Estoque</p>
          <h2>Itens</h2>
          <p className="hero-card__description">
            Acompanhe os itens cadastrados, quantidade consolidada em estoque,
            alertas mínimos e detalhes operacionais.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card__title">Itens cadastrados</p>
          <strong className="stat-card__value">{summary.total}</strong>
          <span className="stat-card__description">
            Total de itens no catálogo do sistema.
          </span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Itens ativos</p>
          <strong className="stat-card__value">{summary.active}</strong>
          <span className="stat-card__description">
            Itens disponíveis para operação.
          </span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Abaixo do mínimo</p>
          <strong className="stat-card__value">{summary.belowMinimum}</strong>
          <span className="stat-card__description">
            Itens com alerta de estoque.
          </span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Controlam validade</p>
          <strong className="stat-card__value">{summary.withExpiration}</strong>
          <span className="stat-card__description">
            Itens que exigem controle de vencimento.
          </span>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-card__header panel-card__header--stack">
          <div>
            <p className="eyebrow">Consulta</p>
            <h3>Catálogo operacional</h3>
          </div>

          <div className="toolbar toolbar--row">
            <input
              className="toolbar__input"
              type="text"
              placeholder="Buscar por item, categoria ou unidade"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <Link to="/items/new" className="button button--link">
              Novo item
            </Link>

            <Link
              to="/item-categories"
              className="button button--secondary button--link"
            >
              Categorias
            </Link>

            <Link
              to="/stock-batches/new"
              className="button button--secondary button--link"
            >
              Nova entrada de lote
            </Link>

            <Link
              to="/stock-movements/new"
              className="button button--secondary button--link"
            >
              Movimentação manual
            </Link>
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">Carregando itens...</p>
        ) : error ? (
          <p className="status-error">{error}</p>
        ) : filteredItems.length === 0 ? (
          <p className="empty-state">
            Nenhum item encontrado para o filtro informado.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoria</th>
                  <th>Unidade</th>
                  <th>Quantidade</th>
                  <th>Mínimo</th>
                  <th>Lotes</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.item_id}>
                    <td>{item.item_name}</td>
                    <td>{item.category_name}</td>
                    <td>{item.unit_measure}</td>
                    <td>{item.total_quantity}</td>
                    <td>{item.minimum_stock_alert}</td>
                    <td>{item.total_batches}</td>
                    <td>
                      {item.is_below_minimum ? (
                        <span className="pill pill--danger">Atenção</span>
                      ) : (
                        <span className="pill pill--success">Ok</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/items/${item.item_id}`} className="table-link">
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
