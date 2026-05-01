import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { formatTodayForInput } from "../utils/format";
import { getApiErrorMessage } from "../utils/api-error";
import type {
  ItemDetailResponse,
  StockBatchCreatePayload,
  StockBatchResponse,
} from "../types/item";

/**
 * Formulário de entrada real de lote no estoque.
 */
export function StockBatchCreatePage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<ItemDetailResponse[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    item_id: "",
    source_type: "doacao_item",
    entry_quantity: 1,
    entry_date: formatTodayForInput(),
    expiration_date: "",
    estimated_unit_value: 0,
    notes: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      try {
        setIsLoadingItems(true);
        const response = await api.get<ItemDetailResponse[]>("/items");

        if (isMounted) {
          setItems(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              err,
              "Não foi possível carregar os itens para entrada de lote."
            )
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingItems(false);
        }
      }
    }

    void loadItems();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === Number(formData.item_id)) ?? null;
  }, [items, formData.item_id]);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formData.item_id) {
      setError("Selecione um item.");
      return;
    }

    if (selectedItem?.tracks_expiration && !formData.expiration_date) {
      setError("Este item exige data de validade.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: StockBatchCreatePayload = {
        item_id: Number(formData.item_id),
        source_type: formData.source_type,
        entry_quantity: Number(formData.entry_quantity),
        entry_date: formData.entry_date,
        expiration_date: formData.expiration_date || null,
        estimated_unit_value: Number(formData.estimated_unit_value),
        notes: formData.notes.trim() || null,
      };

      const response = await api.post<StockBatchResponse>("/stock-batches", payload);
      navigate(`/items/${response.data.item_id}`, {
        state: {
          flash: {
            type: "success",
            message: "Entrada de lote registrada com sucesso.",
          },
        },
      });
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Não foi possível registrar a entrada do lote.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Entrada de estoque</p>
          <h2>Novo lote</h2>
          <p className="hero-card__description">
            Registre uma entrada real de item no estoque com origem, quantidade
            e validade quando necessário.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="panel-card form-panel">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Entrada</p>
            <h3>Dados do lote</h3>
          </div>
        </div>

        <div className="form-grid">
          <label className="form__group">
            <span>Item</span>
            <select
              name="item_id"
              value={formData.item_id}
              onChange={handleInputChange}
              disabled={isLoadingItems}
              required
            >
              <option value="">Selecione</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form__group">
            <span>Origem</span>
            <select
              name="source_type"
              value={formData.source_type}
              onChange={handleInputChange}
            >
              <option value="doacao_item">doacao_item</option>
              <option value="compra_igreja">compra_igreja</option>
              <option value="conversao_dinheiro">conversao_dinheiro</option>
              <option value="ajuste">ajuste</option>
            </select>
          </label>

          <label className="form__group">
            <span>Quantidade de entrada</span>
            <input
              type="number"
              min="1"
              name="entry_quantity"
              value={formData.entry_quantity}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="form__group">
            <span>Data de entrada</span>
            <input
              type="date"
              name="entry_date"
              value={formData.entry_date}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="form__group">
            <span>Validade</span>
            <input
              type="date"
              name="expiration_date"
              value={formData.expiration_date}
              onChange={handleInputChange}
              disabled={selectedItem ? !selectedItem.tracks_expiration : false}
            />
          </label>

          <label className="form__group">
            <span>Valor unitário estimado</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="estimated_unit_value"
              value={formData.estimated_unit_value}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group form__group--wide">
            <span>Observações</span>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
            />
          </label>
        </div>

        {selectedItem ? (
          <div className="detail-item">
            <span>Item selecionado</span>
            <strong>
              {selectedItem.name} • {selectedItem.category_name} •{" "}
              {selectedItem.tracks_expiration ? "Controla validade" : "Sem validade"}
            </strong>
          </div>
        ) : null}

        {error ? (
          <p className="status-error" role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}

        <div className="panel-actions">
          <Link to="/items" className="button button--secondary button--link">
            Cancelar
          </Link>

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Registrar lote"}
          </button>
        </div>
      </form>
    </div>
  );
}
