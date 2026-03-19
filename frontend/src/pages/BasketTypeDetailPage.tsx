import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  BasketAvailabilityResponse,
  BasketTypeDetailResponse,
} from "../types/basket";

/**
 * Detalhe operacional do tipo de cesta, com receita e disponibilidade.
 */
export function BasketTypeDetailPage() {
  const { basketTypeId } = useParams();
  const [basketType, setBasketType] = useState<BasketTypeDetailResponse | null>(null);
  const [availability, setAvailability] = useState<BasketAvailabilityResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadBasketTypeDetail() {
      try {
        setIsLoading(true);
        setError("");

        const [detailResponse, availabilityResponse] = await Promise.all([
          api.get<BasketTypeDetailResponse>(`/basket-types/${basketTypeId}`),
          api.get<BasketAvailabilityResponse>(
            `/basket-types/${basketTypeId}/availability`
          ),
        ]);

        if (!isMounted) {
          return;
        }

        setBasketType(detailResponse.data);
        setAvailability(availabilityResponse.data);
      } catch {
        if (isMounted) {
          setError("Não foi possível carregar o detalhe da cesta.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (basketTypeId) {
      void loadBasketTypeDetail();
    }

    return () => {
      isMounted = false;
    };
  }, [basketTypeId]);

  const limitingItems = useMemo(() => {
    if (!availability) {
      return [];
    }

    return availability.items.filter((item) =>
      availability.limiting_item_ids.includes(item.item_id)
    );
  }, [availability]);

  if (isLoading) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <p className="empty-state">Carregando detalhe da cesta...</p>
        </div>
      </div>
    );
  }

  if (error || !basketType || !availability) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <p className="status-error">
            {error || "Não foi possível carregar a cesta."}
          </p>
          <div className="panel-actions">
            <Link to="/basket-types" className="button button--secondary">
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
          <p className="eyebrow">Detalhe da cesta</p>
          <h2>{basketType.name}</h2>
          <p className="hero-card__description">
            {basketType.notes || "Sem observações adicionais para este tipo de cesta."}
          </p>
        </div>

        <div className="hero-badges">
          <span className="hero-badge">
            Cestas possíveis: {availability.possible_baskets}
          </span>
          <span className="hero-badge">
            Status: {basketType.is_active ? "Ativa" : "Inativa"}
          </span>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Receita</p>
              <h3>Composição da cesta</h3>
            </div>
          </div>

          {basketType.basket_items.length === 0 ? (
            <p className="empty-state">Nenhum item cadastrado nesta receita.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Unidade</th>
                    <th>Quantidade exigida</th>
                  </tr>
                </thead>
                <tbody>
                  {basketType.basket_items.map((item) => (
                    <tr key={item.item_id}>
                      <td>{item.item_name}</td>
                      <td>{item.unit_measure}</td>
                      <td>{item.required_quantity}</td>
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
              <p className="eyebrow">Limite atual</p>
              <h3>Itens limitantes</h3>
            </div>
          </div>

          {limitingItems.length === 0 ? (
            <p className="empty-state">
              Nenhum item limitante identificado no momento.
            </p>
          ) : (
            <div className="stack-list">
              {limitingItems.map((item) => (
                <div key={item.item_id} className="stack-item">
                  <div>
                    <strong>{item.item_name}</strong>
                    <p className="stack-item__muted">
                      Disponível: {item.available_quantity} {item.unit_measure}
                    </p>
                  </div>

                  <span className="pill pill--danger">
                    Faltam {item.missing_for_next_basket}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="content-grid content-grid--single">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Disponibilidade por item</p>
              <h3>Capacidade de montagem</h3>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Necessário</th>
                  <th>Disponível</th>
                  <th>Possíveis por item</th>
                  <th>Falta para próxima</th>
                </tr>
              </thead>
              <tbody>
                {availability.items.map((item) => (
                  <tr key={item.item_id}>
                    <td>{item.item_name}</td>
                    <td>
                      {item.required_quantity} {item.unit_measure}
                    </td>
                    <td>
                      {item.available_quantity} {item.unit_measure}
                    </td>
                    <td>{item.possible_from_item}</td>
                    <td>{item.missing_for_next_basket}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <div className="panel-actions">
        <Link to="/basket-types" className="button button--secondary">
          Voltar para cestas
        </Link>
      </div>
    </div>
  );
}