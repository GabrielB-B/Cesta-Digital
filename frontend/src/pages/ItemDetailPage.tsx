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
  ItemCategoryResponse,
  ItemDetailResponse,
  ItemUpdatePayload,
  StockBatchResponse,
  StockMovementResponse,
  StockSummaryResponse,
} from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateOnly } from "../utils/format";

export function ItemDetailPage() {
  const { itemId } = useParams();
  const [item, setItem] = useState<ItemDetailResponse | null>(null);
  const [summary, setSummary] = useState<StockSummaryResponse | null>(null);
  const [batches, setBatches] = useState<StockBatchResponse[]>([]);
  const [movements, setMovements] = useState<StockMovementResponse[]>([]);
  const [categories, setCategories] = useState<ItemCategoryResponse[]>([]);
  const [editForm, setEditForm] = useState({
    category_id: "",
    name: "",
    unit_measure: "unidade",
    tracks_expiration: true,
    is_active: true,
    reference_unit_value: "0",
    minimum_stock_alert: "0",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadItemDetail() {
      try {
        setIsLoading(true);
        setError("");

        const [
          itemResponse,
          summaryResponse,
          batchesResponse,
          movementsResponse,
          categoriesResponse,
        ] = await Promise.all([
          api.get<ItemDetailResponse>(`/items/${itemId}`),
          api.get<StockSummaryResponse[]>("/stock-summary"),
          api.get<StockBatchResponse[]>("/stock-batches"),
          api.get<StockMovementResponse[]>("/stock-movements"),
          api.get<ItemCategoryResponse[]>("/item-categories"),
        ]);

        if (!isMounted) {
          return;
        }

        const parsedItemId = Number(itemId);
        const loadedItem = itemResponse.data;

        setItem(loadedItem);
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
        setCategories(categoriesResponse.data);
        setEditForm({
          category_id: String(loadedItem.category_id),
          name: loadedItem.name,
          unit_measure: loadedItem.unit_measure,
          tracks_expiration: loadedItem.tracks_expiration,
          is_active: loadedItem.is_active,
          reference_unit_value: String(loadedItem.reference_unit_value),
          minimum_stock_alert: String(loadedItem.minimum_stock_alert),
          notes: loadedItem.notes ?? "",
        });
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, "Nao foi possivel carregar o item."));
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
      return "-";
    }

    return formatDateOnly(value);
  }

  async function handleItemSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!itemId) {
      return;
    }

    try {
      setIsSavingItem(true);
      setError("");
      setSuccessMessage("");

      const payload: ItemUpdatePayload = {
        category_id: Number(editForm.category_id),
        name: editForm.name.trim(),
        unit_measure: editForm.unit_measure,
        tracks_expiration: editForm.tracks_expiration,
        is_active: editForm.is_active,
        reference_unit_value: Number(editForm.reference_unit_value),
        minimum_stock_alert: Number(editForm.minimum_stock_alert),
        notes: editForm.notes.trim() || null,
      };

      const response = await api.put<ItemDetailResponse>(`/items/${itemId}`, payload);
      setItem(response.data);
      setEditForm({
        category_id: String(response.data.category_id),
        name: response.data.name,
        unit_measure: response.data.unit_measure,
        tracks_expiration: response.data.tracks_expiration,
        is_active: response.data.is_active,
        reference_unit_value: String(response.data.reference_unit_value),
        minimum_stock_alert: String(response.data.minimum_stock_alert),
        notes: response.data.notes ?? "",
      });
      setSuccessMessage("Item atualizado com auditoria registrada.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel salvar o item."));
    } finally {
      setIsSavingItem(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <StateMessage variant="loading">
            Carregando detalhe do item...
          </StateMessage>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <StateMessage variant="error">
            {error || "Nao foi possivel carregar o item."}
          </StateMessage>
          <FormActions>
            <Link to="/items" className="button button--secondary">
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
        eyebrow="Detalhe do item"
        title={item.name}
        description={`Categoria: ${item.category_name} | Unidade: ${item.unit_measure}`}
        meta={
          <div className="hero-badges">
          <span className="hero-badge">
            Estoque atual: {summary?.total_quantity ?? totalCurrentQuantity}
          </span>
          <span className="hero-badge">
            Alerta minimo: {item.minimum_stock_alert}
          </span>
          <span className="hero-badge">
            Status: {item.is_active ? "Ativo" : "Inativo"}
          </span>
          <Link
            to={`/stock-movements/new?itemId=${item.id}`}
            className="button button--secondary button--link"
          >
            Nova movimentacao
          </Link>
          </div>
        }
      />

      {error ? (
        <StateMessage variant="error">{error}</StateMessage>
      ) : null}

      <section className="content-grid">
        <article className="panel-card">
          <PanelHeader eyebrow="Resumo" title="Dados principais" />

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
              <span>Valor de referencia</span>
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
              <strong>{item.tracks_expiration ? "Sim" : "Nao"}</strong>
            </div>
          </div>
        </article>

        <form onSubmit={handleItemSave} className="panel-card form-panel">
          <FormSection eyebrow="Cadastro" title="Editar item">
            <label className="form__group">
              <span>Categoria</span>
              <select
                value={editForm.category_id}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    category_id: event.target.value,
                  }))
                }
                required
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form__group">
              <span>Nome</span>
              <input
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="form__group">
              <span>Unidade</span>
              <select
                value={editForm.unit_measure}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    unit_measure: event.target.value,
                  }))
                }
              >
                <option value="unidade">Unidade</option>
                <option value="pacote">Pacote</option>
                <option value="kg">Kg</option>
                <option value="litro">Litro</option>
                <option value="caixa">Caixa</option>
                <option value="frasco">Frasco</option>
              </select>
            </label>

            <label className="form__group">
              <span>Valor de referencia</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editForm.reference_unit_value}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    reference_unit_value: event.target.value,
                  }))
                }
              />
            </label>

            <label className="form__group">
              <span>Alerta minimo</span>
              <input
                type="number"
                min="0"
                value={editForm.minimum_stock_alert}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    minimum_stock_alert: event.target.value,
                  }))
                }
              />
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={editForm.tracks_expiration}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    tracks_expiration: event.target.checked,
                  }))
                }
              />
              Controla validade
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    is_active: event.target.checked,
                  }))
                }
              />
              Item ativo
            </label>

            <label className="form__group form__group--wide">
              <span>Observacoes</span>
              <textarea
                value={editForm.notes}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
                rows={3}
              />
            </label>
          </FormSection>

          {successMessage ? (
            <StateMessage variant="success">{successMessage}</StateMessage>
          ) : null}

          <FormActions>
            <button type="submit" className="button" disabled={isSavingItem}>
              {isSavingItem ? "Salvando..." : "Salvar item"}
            </button>
          </FormActions>
        </form>
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <PanelHeader eyebrow="Lotes" title="Entradas e saldos" />

          {batches.length === 0 ? (
            <StateMessage>Nenhum lote encontrado para este item.</StateMessage>
          ) : (
            <DataTable caption="Lotes do item">
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
            </DataTable>
          )}
        </article>

        <article className="panel-card">
          <PanelHeader eyebrow="Movimentacoes" title="Historico do item" />

          {movements.length === 0 ? (
            <StateMessage>
              Nenhuma movimentacao encontrada para este item.
            </StateMessage>
          ) : (
            <DataTable caption="Historico de movimentacoes do item">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Lote</th>
                    <th>Observacao</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.id}</td>
                      <td>{movement.movement_type}</td>
                      <td>{movement.quantity}</td>
                      <td>{movement.batch_id}</td>
                      <td>{movement.notes ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
            </DataTable>
          )}
        </article>
      </section>

      <FormActions>
        <Link to="/items" className="button button--secondary">
          Voltar para itens
        </Link>
      </FormActions>
    </div>
  );
}
