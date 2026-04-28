import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  ItemDetailResponse,
  StockBatchResponse,
  StockMovementResponse,
  StockSummaryResponse,
} from "../types/item";

/**
 * Detalhe operacional de um item com resumo, lotes e movimentações.
 */
export function ItemDetailPage() {
  const { itemId } = useParams();
  const [item, setItem] = useState<ItemDetailResponse | null>(null);
  const [summary, setSummary] = useState<StockSummaryResponse | null>(null);
  const [batches, setBatches] = useState<StockBatchResponse[]>([]);
  const [movements, setMovements] = useState<StockMovementResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadItemDetail() {
      try {
        setIsLoading(true);
        setError("");

        const [itemResponse, summaryResponse, batchesResponse, movementsResponse] =
          await Promise.all([
            api.get<ItemDetailResponse>(`/items/${itemId}`),
            api.get<StockSummaryResponse[]>("/stock-summary"),
            api.get<StockBatchResponse[]>("/stock-batches"),
            api.get<StockMovementResponse[]>("/stock-movements"),
          ]);

        if (!isMounted) {
          return;
        }

        const parsedItemId = Number(itemId);

        setItem(itemResponse.data);
        setSummary(
          summaryResponse.data.find((entry) => entry.item_id === parsedItemId) ??
            null
        );
        setBatches(
          batchesResponse.data.filter((batch) => batch.item_id === parsedItemId)
        );
        setMovements(
          movementsResponse.data.filter(
            (movement) => movement.item_id === parsedItemId
          )
        );
      } catch {
        if (isMounted) {
          setError("Não foi possível carregar o detalhe do item.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (itemId) {
      void loadItemDetail();
    }

    return () => {
      isMounted = false;
    };
  }, [itemId]);

  const totalCurrentQuantity = useMemo(() => {
    return batches.reduce((acc, batch) => acc + batch.current_quantity, 0);
  }, [batches]);

  function formatCurrency(value: string): string {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(value: string | null): string {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleDateString("pt-BR");
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <p className="empty-state">Carregando detalhe do item...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <p className="status-error">
            {error || "Não foi possível carregar o item."}
          </p>
          <div className="panel-actions">
            <Link to="/items" className="button button--secondary">
              Voltar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Detalhe do item</p>
          <h2>{item.name}</h2>
          <p className="hero-card__description">
            Categoria: {item.category_name} • Unidade: {item.unit_measure}
          </p>
        </div>

        <div className="hero-badges">
          <span className="hero-badge">
            Estoque atual: {summary?.total_quantity ?? totalCurrentQuantity}
          </span>
          <span className="hero-badge">
            Alerta mínimo: {item.minimum_stock_alert}
          </span>
          <Link
            to={`/stock-movements/new?itemId=${item.id}`}
            className="button button--secondary button--link"
          >
            Nova movimentação
          </Link>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Resumo</p>
              <h3>Dados principais</h3>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span>Categoria</span>
              <strong>{item.category_name}</strong>
            </div>
            <div className="detail-item">
              <span>Unidade</span>
              <strong>{item.unit_measure}</strong>
            </div>
            <div className="detail-item">
              <span>Valor de referência</span>
              <strong>{formatCurrency(item.reference_unit_value)}</strong>
            </div>
            <div className="detail-item">
              <span>Quantidade atual</span>
              <strong>{summary?.total_quantity ?? totalCurrentQuantity}</strong>
            </div>
            <div className="detail-item">
              <span>Total de lotes</span>
              <strong>{summary?.total_batches ?? batches.length}</strong>
            </div>
            <div className="detail-item">
              <span>Controla validade</span>
              <strong>{item.tracks_expiration ? "Sim" : "Não"}</strong>
            </div>
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Observações</p>
              <h3>Anotações do item</h3>
            </div>
          </div>

          <p className="detail-paragraph">
            {item.notes || "Nenhuma observação cadastrada para este item."}
          </p>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Lotes</p>
              <h3>Entradas e saldos</h3>
            </div>
          </div>

          {batches.length === 0 ? (
            <p className="empty-state">Nenhum lote encontrado para este item.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Origem</th>
                    <th>Entrada</th>
                    <th>Atual</th>
                    <th>Entrada em</th>
                    <th>Validade</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id}>
                      <td>{batch.id}</td>
                      <td>{batch.source_type}</td>
                      <td>{batch.entry_quantity}</td>
                      <td>{batch.current_quantity}</td>
                      <td>{formatDate(batch.entry_date)}</td>
                      <td>{formatDate(batch.expiration_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Movimentações</p>
              <h3>Histórico do item</h3>
            </div>
          </div>

          {movements.length === 0 ? (
            <p className="empty-state">
              Nenhuma movimentação encontrada para este item.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Lote</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.id}</td>
                      <td>{movement.movement_type}</td>
                      <td>{movement.quantity}</td>
                      <td>{movement.batch_id}</td>
                      <td>{movement.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <div className="panel-actions">
        <Link to="/items" className="button button--secondary">
          Voltar para itens
        </Link>
      </div>
    </div>
  );
}
