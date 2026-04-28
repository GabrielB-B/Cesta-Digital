import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  BasketAvailabilityResponse,
  BasketTypeDetailResponse,
  BasketTypeItemCreatePayload,
} from "../types/basket";
import type { ItemDetailResponse } from "../types/item";

/**
 * Detalhe operacional do tipo de cesta, com receita e disponibilidade.
 */
export function BasketTypeDetailPage() {
  const { basketTypeId } = useParams();
  const [basketType, setBasketType] = useState<BasketTypeDetailResponse | null>(null);
  const [availability, setAvailability] = useState<BasketAvailabilityResponse | null>(
    null
  );
  const [items, setItems] = useState<ItemDetailResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingRecipe, setIsSubmittingRecipe] = useState(false);
  const [error, setError] = useState("");
  const [recipeError, setRecipeError] = useState("");
  const [recipeForm, setRecipeForm] = useState({
    item_id: "",
    required_quantity: 1,
  });

  async function loadBasketTypeData(targetBasketTypeId: string) {
    setIsLoading(true);
    setError("");

    try {
      const [detailResponse, availabilityResponse, itemsResponse] = await Promise.all([
        api.get<BasketTypeDetailResponse>(`/basket-types/${targetBasketTypeId}`),
        api.get<BasketAvailabilityResponse>(
          `/basket-types/${targetBasketTypeId}/availability`
        ),
        api.get<ItemDetailResponse[]>("/items"),
      ]);

      setBasketType(detailResponse.data);
      setAvailability(availabilityResponse.data);
      setItems(itemsResponse.data);
    } catch {
      setError("Não foi possível carregar o detalhe da cesta.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (basketTypeId) {
      void loadBasketTypeData(basketTypeId);
    }
  }, [basketTypeId]);

  const limitingItems = useMemo(() => {
    if (!availability) {
      return [];
    }

    return availability.items.filter((item) =>
      availability.limiting_item_ids.includes(item.item_id)
    );
  }, [availability]);

  const availableItemsToAdd = useMemo(() => {
    const existingItemIds = new Set(basketType?.basket_items.map((item) => item.item_id) ?? []);
    return items.filter((item) => !existingItemIds.has(item.id));
  }, [basketType, items]);

  async function handleAddRecipeItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecipeError("");

    if (!basketTypeId || !recipeForm.item_id) {
      setRecipeError("Selecione um item para adicionar à receita.");
      return;
    }

    setIsSubmittingRecipe(true);

    try {
      const payload: BasketTypeItemCreatePayload = {
        item_id: Number(recipeForm.item_id),
        required_quantity: Number(recipeForm.required_quantity),
      };

      await api.post(`/basket-types/${basketTypeId}/items`, payload);
      setRecipeForm({
        item_id: "",
        required_quantity: 1,
      });
      await loadBasketTypeData(basketTypeId);
    } catch {
      setRecipeError("Não foi possível adicionar o item à receita.");
    } finally {
      setIsSubmittingRecipe(false);
    }
  }

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

        <form onSubmit={handleAddRecipeItem} className="panel-card form-panel">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Receita</p>
              <h3>Adicionar item</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="form__group form__group--wide">
              <span>Item disponível</span>
              <select
                value={recipeForm.item_id}
                onChange={(event) =>
                  setRecipeForm((previous) => ({
                    ...previous,
                    item_id: event.target.value,
                  }))
                }
                required
              >
                <option value="">Selecione</option>
                {availableItemsToAdd.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} • {item.category_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form__group">
              <span>Quantidade exigida</span>
              <input
                type="number"
                min="1"
                value={recipeForm.required_quantity}
                onChange={(event) =>
                  setRecipeForm((previous) => ({
                    ...previous,
                    required_quantity: Number(event.target.value),
                  }))
                }
                required
              />
            </label>
          </div>

          {availableItemsToAdd.length === 0 ? (
            <p className="empty-state">
              Todos os itens cadastrados já estão presentes nesta receita.
            </p>
          ) : null}

          {recipeError ? <p className="status-error">{recipeError}</p> : null}

          <div className="panel-actions">
            <button
              type="submit"
              className="button"
              disabled={isSubmittingRecipe || availableItemsToAdd.length === 0}
            >
              {isSubmittingRecipe ? "Salvando..." : "Adicionar à receita"}
            </button>
          </div>
        </form>
      </section>

      <section className="content-grid">
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

        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Disponibilidade</p>
              <h3>Resumo rápido</h3>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span>Total de itens na receita</span>
              <strong>{basketType.basket_items.length}</strong>
            </div>
            <div className="detail-item">
              <span>Cestas possíveis</span>
              <strong>{availability.possible_baskets}</strong>
            </div>
            <div className="detail-item">
              <span>Itens limitantes</span>
              <strong>{limitingItems.length}</strong>
            </div>
          </div>
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
