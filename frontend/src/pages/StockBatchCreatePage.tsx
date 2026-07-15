import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { StateMessage } from "../components/StateMessage";
import { getApiErrorMessage } from "../utils/api-error";
import { formatSaoPauloTodayForInput } from "../utils/stock";
import type {
  ItemDetailResponse,
  StockBatchCreatePayload,
  StockBatchResponse,
} from "../types/item";

type StockBatchErrorField =
  | "item_id"
  | "entry_quantity"
  | "entry_date"
  | "expiration_date"
  | "estimated_unit_value"
  | "form";

function focusStockBatchError(
  form: HTMLFormElement | null,
  summary: HTMLParagraphElement | null,
  field: StockBatchErrorField
) {
  window.requestAnimationFrame(() => {
    const fieldControl =
      field === "form"
        ? null
        : form?.querySelector<HTMLElement>(`[name="${field}"]`);
    (fieldControl ?? summary)?.focus();
  });
}

/**
 * Formulário de entrada real de lote no estoque.
 */
export function StockBatchCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedItemId = searchParams.get("itemId");
  const cameFromItemCreation = searchParams.get("from") === "item-create";

  const [items, setItems] = useState<ItemDetailResponse[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<StockBatchErrorField | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const errorSummaryRef = useRef<HTMLParagraphElement | null>(null);

  const [formData, setFormData] = useState({
    item_id: "",
    source_type: "doacao_item",
    entry_quantity: 1,
    entry_date: formatSaoPauloTodayForInput(),
    expiration_date: "",
    estimated_unit_value: 0,
    notes: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      try {
        setIsLoadingItems(true);
        setError("");
        setErrorField(null);
        const response = await api.get<ItemDetailResponse[]>("/items", {
          params: { is_active: true },
        });

        if (isMounted) {
          setItems(response.data);
          const requestedItem = response.data.find(
            (item) => String(item.id) === requestedItemId
          );

          setFormData((previous) => ({
            ...previous,
            item_id: requestedItem ? String(requestedItem.id) : "",
            expiration_date: "",
          }));

          if (requestedItemId && !requestedItem) {
            setError(
              "O item indicado não está disponível. Selecione um item válido para continuar."
            );
            setErrorField("item_id");
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              err,
              "Não foi possível carregar os itens para entrada de lote."
            )
          );
          setErrorField("form");
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
  }, [requestedItemId]);

  useEffect(() => {
    if (!error || !errorField || isLoadingItems) {
      return;
    }

    focusStockBatchError(
      formRef.current,
      errorSummaryRef.current,
      errorField
    );
  }, [error, errorField, isLoadingItems]);

  function reportError(message: string, field: StockBatchErrorField) {
    setError(message);
    setErrorField(field);
  }

  function clearError() {
    setError("");
    setErrorField(null);
  }

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === Number(formData.item_id)) ?? null;
  }, [items, formData.item_id]);

  const requestedItemIsValid = useMemo(() => {
    return Boolean(
      requestedItemId &&
        items.some((item) => String(item.id) === requestedItemId)
    );
  }, [items, requestedItemId]);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    if (name === "item_id") {
      clearError();

      setFormData((previous) => ({
        ...previous,
        item_id: value,
        expiration_date: "",
      }));
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
    clearError();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    if (!selectedItem) {
      reportError("Selecione um item válido.", "item_id");
      return;
    }

    const entryQuantity = Number(formData.entry_quantity);

    if (!Number.isInteger(entryQuantity) || entryQuantity < 1) {
      reportError(
        "Informe uma quantidade de entrada inteira e maior que zero.",
        "entry_quantity"
      );
      return;
    }

    if (!formData.entry_date) {
      reportError("Informe a data de entrada.", "entry_date");
      return;
    }

    if (formData.entry_date > formatSaoPauloTodayForInput()) {
      reportError("A data de entrada não pode ser futura.", "entry_date");
      return;
    }

    if (selectedItem.tracks_expiration && !formData.expiration_date) {
      reportError("Este item exige data de validade.", "expiration_date");
      return;
    }

    if (
      formData.expiration_date &&
      formData.expiration_date < formData.entry_date
    ) {
      reportError(
        "A data de validade não pode ser anterior à data de entrada.",
        "expiration_date"
      );
      return;
    }

    const estimatedUnitValue = Number(formData.estimated_unit_value);

    if (!Number.isFinite(estimatedUnitValue) || estimatedUnitValue < 0) {
      reportError(
        "Informe um valor unitário estimado igual ou maior que zero.",
        "estimated_unit_value"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: StockBatchCreatePayload = {
        item_id: selectedItem.id,
        source_type: formData.source_type,
        entry_quantity: entryQuantity,
        entry_date: formData.entry_date,
        expiration_date: formData.expiration_date || null,
        estimated_unit_value: estimatedUnitValue,
        notes: formData.notes.trim() || null,
      };

      const response = await api.post<StockBatchResponse>("/stock-batches", payload);
      navigate(`/items/${response.data.item_id}`, {
        state: {
          flash: {
            type: "success",
            message:
              "Entrada registrada com sucesso. O saldo foi atualizado; registre outra entrada se houver outro lote.",
          },
        },
      });
    } catch (err) {
      reportError(
        getApiErrorMessage(err, "Não foi possível registrar a entrada do lote."),
        "form"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Estoque"
        title="Registrar entrada"
        description="Cada recebimento gera um lote. Informe origem, quantidade e, quando o item controlar validade, a data desta entrada."
      />

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="panel-card form-panel"
        noValidate
      >
        {cameFromItemCreation && requestedItemIsValid ? (
          <StateMessage variant="success">
            Item cadastrado. Registre agora a primeira entrada para adicionar
            quantidade ao estoque, ou veja o item sem criar um lote neste momento.
          </StateMessage>
        ) : null}

        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Entrada</p>
            <h2>Dados do recebimento</h2>
          </div>
        </div>

        <div className="form-grid">
          <label className="form__group">
            <span>Item</span>
            <select
              name="item_id"
              aria-label="Item"
              value={formData.item_id}
              onChange={handleInputChange}
              disabled={isLoadingItems}
              required
              aria-invalid={errorField === "item_id"}
              aria-describedby={
                errorField === "item_id" ? "stock-batch-form-error" : undefined
              }
            >
              <option value="">
                {isLoadingItems
                  ? "Carregando itens…"
                  : "Selecione o item recebido"}
              </option>
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
              <option value="doacao_item">Doação de item</option>
              <option value="compra_igreja">
                Compra com recursos da instituição
              </option>
              <option value="conversao_dinheiro">
                Conversão de doação em dinheiro
              </option>
              <option value="ajuste">Ajuste de inventário</option>
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
              aria-invalid={errorField === "entry_quantity"}
              aria-describedby={
                errorField === "entry_quantity"
                  ? "stock-batch-form-error"
                  : undefined
              }
            />
          </label>

          <label className="form__group">
            <span>Data de entrada</span>
            <input
              type="date"
              name="entry_date"
              value={formData.entry_date}
              onChange={handleInputChange}
              max={formatSaoPauloTodayForInput()}
              required
              aria-invalid={errorField === "entry_date"}
              aria-describedby={
                errorField === "entry_date" ? "stock-batch-form-error" : undefined
              }
            />
          </label>

          <label className="form__group">
            <span>Data de validade do lote</span>
            <input
              type="date"
              name="expiration_date"
              aria-label="Data de validade do lote"
              value={formData.expiration_date}
              onChange={handleInputChange}
              disabled={!selectedItem?.tracks_expiration}
              required={Boolean(selectedItem?.tracks_expiration)}
              min={formData.entry_date}
              aria-invalid={errorField === "expiration_date"}
              aria-describedby={`expiration-date-help${
                errorField === "expiration_date" ? " stock-batch-form-error" : ""
              }`}
            />
            <small id="expiration-date-help" className="form__hint">
              {!selectedItem
                ? "Selecione um item para verificar se a validade é obrigatória."
                : selectedItem.tracks_expiration
                  ? "Obrigatória para esta entrada. Use a data impressa na embalagem deste lote."
                  : "Este item não controla validade; nenhuma data será enviada."}
            </small>
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
              aria-invalid={errorField === "estimated_unit_value"}
              aria-describedby={
                errorField === "estimated_unit_value"
                  ? "stock-batch-form-error"
                  : undefined
              }
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
              {selectedItem.tracks_expiration
                ? "Validade obrigatória por lote"
                : "Não controla validade"}
            </strong>
          </div>
        ) : null}

        {!isLoadingItems && items.length === 0 ? (
          <StateMessage variant="error">
            Nenhum item ativo está disponível. Cadastre um item antes de registrar
            a entrada.
          </StateMessage>
        ) : null}

        {error ? (
          <p
            ref={errorSummaryRef}
            id="stock-batch-form-error"
            className="status-error"
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            {error}
          </p>
        ) : null}

        <div className="panel-actions">
          <Link
            to={
              requestedItemId && requestedItemIsValid
                ? `/items/${requestedItemId}`
                : "/items"
            }
            className="button button--secondary button--link"
          >
            {cameFromItemCreation && requestedItemIsValid
              ? "Agora não, ver item"
              : "Cancelar"}
          </Link>

          <button
            type="submit"
            className="button"
            disabled={
              isSubmitting || isLoadingItems || items.length === 0 || !selectedItem
            }
          >
            {isSubmitting ? "Salvando…" : "Registrar entrada"}
          </button>
        </div>
      </form>
    </div>
  );
}
