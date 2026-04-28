import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  ItemDetailResponse,
  StockBatchResponse,
  StockMovementCreatePayload,
  StockMovementResponse,
} from "../types/item";

const movementTypeOptions = [
  { value: "saida_manual", label: "Saída manual" },
  { value: "perda_validade", label: "Perda por validade" },
  { value: "ajuste_negativo", label: "Ajuste negativo" },
  { value: "ajuste_positivo", label: "Ajuste positivo" },
];

/**
 * Registro manual de movimentação de estoque.
 */
export function StockMovementCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedItemId = Number(searchParams.get("itemId") || 0);

  const [items, setItems] = useState<ItemDetailResponse[]>([]);
  const [batches, setBatches] = useState<StockBatchResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    batch_id: "",
    movement_type: "saida_manual",
    quantity: 1,
    notes: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      try {
        setIsLoading(true);
        setError("");

        const [itemsResponse, batchesResponse] = await Promise.all([
          api.get<ItemDetailResponse[]>("/items"),
          api.get<StockBatchResponse[]>("/stock-batches"),
        ]);

        if (!isMounted) {
          return;
        }

        setItems(itemsResponse.data);
        setBatches(batchesResponse.data);

        if (preselectedItemId) {
          const firstBatch = batchesResponse.data.find(
            (batch) => batch.item_id === preselectedItemId && batch.current_quantity > 0
          );

          if (firstBatch) {
            setFormData((previous) => ({
              ...previous,
              batch_id: String(firstBatch.id),
            }));
          }
        }
      } catch {
        if (isMounted) {
          setError("Não foi possível carregar lotes e itens.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, [preselectedItemId]);

  const visibleBatches = useMemo(() => {
    if (!preselectedItemId) {
      return batches;
    }

    return batches.filter((batch) => batch.item_id === preselectedItemId);
  }, [batches, preselectedItemId]);

  const selectedBatch = useMemo(() => {
    return visibleBatches.find((batch) => batch.id === Number(formData.batch_id)) ?? null;
  }, [formData.batch_id, visibleBatches]);

  const selectedItem = useMemo(() => {
    const itemId = selectedBatch?.item_id ?? preselectedItemId;
    return items.find((item) => item.id === itemId) ?? null;
  }, [items, preselectedItemId, selectedBatch]);

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

    if (!formData.batch_id) {
      setError("Selecione um lote.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: StockMovementCreatePayload = {
        batch_id: Number(formData.batch_id),
        movement_type: formData.movement_type,
        quantity: Number(formData.quantity),
        notes: formData.notes.trim() || null,
      };

      const response = await api.post<StockMovementResponse>(
        "/stock-movements",
        payload
      );
      navigate(`/items/${response.data.item_id}`);
    } catch {
      setError("Não foi possível registrar a movimentação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Estoque</p>
          <h2>Movimentação manual</h2>
          <p className="hero-card__description">
            Registre ajustes, perdas e saídas manuais sobre um lote específico.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="panel-card form-panel">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Registro</p>
            <h3>Dados da movimentação</h3>
          </div>
        </div>

        <div className="form-grid">
          <label className="form__group form__group--wide">
            <span>Lote</span>
            <select
              name="batch_id"
              value={formData.batch_id}
              onChange={handleInputChange}
              disabled={isLoading}
              required
            >
              <option value="">Selecione</option>
              {visibleBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  Lote #{batch.id} • Item #{batch.item_id} • Saldo {batch.current_quantity}
                </option>
              ))}
            </select>
          </label>

          <label className="form__group">
            <span>Tipo</span>
            <select
              name="movement_type"
              value={formData.movement_type}
              onChange={handleInputChange}
            >
              {movementTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form__group">
            <span>Quantidade</span>
            <input
              type="number"
              min="1"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              required
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

        {selectedBatch ? (
          <div className="detail-grid">
            <div className="detail-item">
              <span>Item</span>
              <strong>{selectedItem?.name ?? `Item #${selectedBatch.item_id}`}</strong>
            </div>
            <div className="detail-item">
              <span>Saldo atual</span>
              <strong>{selectedBatch.current_quantity}</strong>
            </div>
            <div className="detail-item">
              <span>Validade</span>
              <strong>
                {selectedBatch.expiration_date
                  ? new Date(selectedBatch.expiration_date).toLocaleDateString("pt-BR")
                  : "Sem validade"}
              </strong>
            </div>
          </div>
        ) : null}

        {error ? <p className="status-error">{error}</p> : null}

        <div className="panel-actions panel-actions--spread">
          <Link to="/items" className="button button--secondary button--link">
            Cancelar
          </Link>

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Registrar movimentação"}
          </button>
        </div>
      </form>
    </div>
  );
}
