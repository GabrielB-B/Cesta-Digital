import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { DataTable } from "../components/DataTable";
import { FormActions } from "../components/FormActions";
import { FormSection } from "../components/FormSection";
import { PageHeader } from "../components/PageHeader";
import { PanelHeader } from "../components/PanelHeader";
import { StateMessage } from "../components/StateMessage";
import type {
  BasketAvailabilityResponse,
  BasketTypeDetailResponse,
  BasketTypeItemCreatePayload,
} from "../types/basket";
import type { ItemDetailResponse } from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";

export function BasketTypeDetailPage() {
  const { basketTypeId } = useParams();
  const [basketType, setBasketType] = useState<BasketTypeDetailResponse | null>(null);
  const [availability, setAvailability] = useState<BasketAvailabilityResponse | null>(
    null
  );
  const [items, setItems] = useState<ItemDetailResponse[]>([]);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});
  const [basketForm, setBasketForm] = useState({
    name: "",
    is_active: true,
    notes: "",
  });
  const [recipeForm, setRecipeForm] = useState({
    item_id: "",
    required_quantity: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBasket, setIsSavingBasket] = useState(false);
  const [isSubmittingRecipe, setIsSubmittingRecipe] = useState(false);
  const [busyRecipeItemId, setBusyRecipeItemId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [recipeError, setRecipeError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
      setBasketForm({
        name: detailResponse.data.name,
        is_active: detailResponse.data.is_active,
        notes: detailResponse.data.notes ?? "",
      });
      setQuantityDrafts(
        Object.fromEntries(
          detailResponse.data.basket_items.map((item) => [
            item.item_id,
            String(item.required_quantity),
          ])
        )
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel carregar a cesta."));
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
    const existingItemIds = new Set(
      basketType?.basket_items.map((item) => item.item_id) ?? []
    );
    return items.filter((item) => !existingItemIds.has(item.id));
  }, [basketType, items]);

  async function handleSaveBasketType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!basketTypeId) {
      return;
    }

    try {
      setIsSavingBasket(true);
      setError("");
      setSuccessMessage("");

      await api.put(`/basket-types/${basketTypeId}`, {
        name: basketForm.name.trim(),
        is_active: basketForm.is_active,
        notes: basketForm.notes.trim() || null,
      });
      await loadBasketTypeData(basketTypeId);
      setSuccessMessage("Tipo de cesta atualizado com auditoria registrada.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel salvar o tipo de cesta."));
    } finally {
      setIsSavingBasket(false);
    }
  }

  async function handleAddRecipeItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecipeError("");

    if (!basketTypeId || !recipeForm.item_id) {
      setRecipeError("Selecione um item para adicionar a receita.");
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
    } catch (err) {
      setRecipeError(getApiErrorMessage(err, "Nao foi possivel adicionar o item."));
    } finally {
      setIsSubmittingRecipe(false);
    }
  }

  async function handleUpdateRecipeItem(itemId: number) {
    if (!basketTypeId) {
      return;
    }

    try {
      setBusyRecipeItemId(itemId);
      setRecipeError("");
      await api.put(`/basket-types/${basketTypeId}/items/${itemId}`, {
        required_quantity: Number(quantityDrafts[itemId] ?? 0),
      });
      await loadBasketTypeData(basketTypeId);
    } catch (err) {
      setRecipeError(getApiErrorMessage(err, "Nao foi possivel atualizar a receita."));
    } finally {
      setBusyRecipeItemId(null);
    }
  }

  async function handleDeleteRecipeItem(itemId: number) {
    if (!basketTypeId) {
      return;
    }

    const confirmed = window.confirm("Remover este item da receita?");
    if (!confirmed) {
      return;
    }

    try {
      setBusyRecipeItemId(itemId);
      setRecipeError("");
      await api.delete(`/basket-types/${basketTypeId}/items/${itemId}`);
      await loadBasketTypeData(basketTypeId);
    } catch (err) {
      setRecipeError(getApiErrorMessage(err, "Nao foi possivel remover o item."));
    } finally {
      setBusyRecipeItemId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <StateMessage variant="loading">
            Carregando detalhe da cesta...
          </StateMessage>
        </div>
      </div>
    );
  }

  if (error || !basketType || !availability) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <StateMessage variant="error">
            {error || "Nao foi possivel carregar a cesta."}
          </StateMessage>
          <FormActions>
            <Link to="/basket-types" className="button button--secondary">
              Voltar
            </Link>
          </FormActions>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Detalhe da cesta"
        title={basketType.name}
        description={
          basketType.notes || "Sem observacoes adicionais para este tipo de cesta."
        }
        meta={
          <div className="hero-badges">
          <span className="hero-badge">
            Cestas possiveis: {availability.possible_baskets}
          </span>
          <span className="hero-badge">
            Status: {basketType.is_active ? "Ativa" : "Inativa"}
          </span>
          </div>
        }
      />

      {successMessage ? (
        <StateMessage variant="success">{successMessage}</StateMessage>
      ) : null}

      <section className="content-grid">
        <form onSubmit={handleSaveBasketType} className="panel-card form-panel">
          <FormSection eyebrow="Cadastro" title="Editar tipo de cesta">
            <label className="form__group">
              <span>Nome</span>
              <input
                value={basketForm.name}
                onChange={(event) =>
                  setBasketForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={basketForm.is_active}
                onChange={(event) =>
                  setBasketForm((previous) => ({
                    ...previous,
                    is_active: event.target.checked,
                  }))
                }
              />
              Tipo ativo
            </label>

            <label className="form__group form__group--wide">
              <span>Observacoes</span>
              <textarea
                value={basketForm.notes}
                onChange={(event) =>
                  setBasketForm((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
                rows={3}
              />
            </label>
          </FormSection>

          <FormActions>
            <button type="submit" className="button" disabled={isSavingBasket}>
              {isSavingBasket ? "Salvando..." : "Salvar tipo"}
            </button>
          </FormActions>
        </form>

        <form onSubmit={handleAddRecipeItem} className="panel-card form-panel">
          <FormSection eyebrow="Receita" title="Adicionar item">
            <label className="form__group form__group--wide">
              <span>Item disponivel</span>
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
                    {item.name} | {item.category_name}
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
          </FormSection>

          {availableItemsToAdd.length === 0 ? (
            <StateMessage>
              Todos os itens cadastrados ja estao presentes nesta receita.
            </StateMessage>
          ) : null}

          {recipeError ? (
            <StateMessage variant="error">{recipeError}</StateMessage>
          ) : null}

          <FormActions>
            <button
              type="submit"
              className="button"
              disabled={isSubmittingRecipe || availableItemsToAdd.length === 0}
            >
              {isSubmittingRecipe ? "Salvando..." : "Adicionar a receita"}
            </button>
          </FormActions>
        </form>
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <PanelHeader eyebrow="Receita" title="Composicao da cesta" />

          {basketType.basket_items.length === 0 ? (
            <StateMessage>Nenhum item cadastrado nesta receita.</StateMessage>
          ) : (
            <DataTable caption="Composicao da cesta">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Unidade</th>
                    <th>Quantidade</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {basketType.basket_items.map((item) => (
                    <tr key={item.item_id}>
                      <td>{item.item_name}</td>
                      <td>{item.unit_measure}</td>
                      <td>
                        <input
                          className="table-input"
                          type="number"
                          min="1"
                          value={quantityDrafts[item.item_id] ?? item.required_quantity}
                          onChange={(event) =>
                            setQuantityDrafts((previous) => ({
                              ...previous,
                              [item.item_id]: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="button button--secondary button--small"
                            disabled={busyRecipeItemId === item.item_id}
                            onClick={() => void handleUpdateRecipeItem(item.item_id)}
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            className="button button--danger button--small"
                            disabled={busyRecipeItemId === item.item_id}
                            onClick={() => void handleDeleteRecipeItem(item.item_id)}
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </DataTable>
          )}
        </article>

        <article className="panel-card">
          <PanelHeader eyebrow="Limite atual" title="Itens limitantes" />

          {limitingItems.length === 0 ? (
            <StateMessage>
              Nenhum item limitante identificado no momento.
            </StateMessage>
          ) : (
            <div className="stack-list">
              {limitingItems.map((item) => (
                <div key={item.item_id} className="stack-item">
                  <div>
                    <strong>{item.item_name}</strong>
                    <p className="stack-item__muted">
                      Disponivel: {item.available_quantity} {item.unit_measure}
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
          <PanelHeader
            eyebrow="Disponibilidade por item"
            title="Capacidade de montagem"
          />

          <DataTable caption="Capacidade de montagem por item">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Necessario</th>
                  <th>Disponivel</th>
                  <th>Possiveis por item</th>
                  <th>Falta para proxima</th>
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
          </DataTable>
        </article>
      </section>

      <FormActions>
        <Link to="/basket-types" className="button button--secondary">
          Voltar para cestas
        </Link>
      </FormActions>
    </div>
  );
}
