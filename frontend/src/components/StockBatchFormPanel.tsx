import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, ChevronDown } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  ItemDetailResponse,
  StockBatchCreatePayload,
  StockBatchResponse,
} from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";
import { formatSaoPauloTodayForInput } from "../utils/stock";
import styles from "./StockBatchFormPanel.module.css";

type StockBatchErrorField =
  | "item_id"
  | "batch_code"
  | "status"
  | "entry_quantity"
  | "entry_date"
  | "expiration_date"
  | "storage_location"
  | "quarantine_reason"
  | "estimated_unit_value"
  | "form";

type FormValues = {
  item_id: string;
  batch_code: string;
  source_type: string;
  status: StockBatchCreatePayload["status"];
  entry_quantity: number | string;
  entry_date: string;
  expiration_date: string;
  storage_location: string;
  quarantine_reason: string;
  estimated_unit_value: number | string;
  notes: string;
};

interface StockBatchFormPanelProps {
  variant?: "panel" | "page";
  availableItems?: ItemDetailResponse[];
  isLoadingAvailableItems?: boolean;
  onCreated?: (batch: StockBatchResponse) => void;
}

function createInitialValues(initialItemId = ""): FormValues {
  return {
    item_id: initialItemId,
    batch_code: "",
    source_type: "doacao_item",
    status: "disponivel",
    entry_quantity: 1,
    entry_date: formatSaoPauloTodayForInput(),
    expiration_date: "",
    storage_location: "",
    quarantine_reason: "",
    estimated_unit_value: 0,
    notes: "",
  };
}

function focusStockBatchError(
  form: HTMLFormElement | null,
  summary: HTMLParagraphElement | null,
  field: StockBatchErrorField,
) {
  window.requestAnimationFrame(() => {
    const fieldControl =
      field === "form"
        ? null
        : form?.querySelector<HTMLElement>(`[name="${field}"]`);
    (fieldControl ?? summary)?.focus();
  });
}

export function StockBatchFormPanel({
  variant = "panel",
  availableItems,
  isLoadingAvailableItems = false,
  onCreated,
}: StockBatchFormPanelProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedItemId = searchParams.get("itemId");
  const cameFromItemCreation = searchParams.get("from") === "item-create";
  const [loadedItems, setLoadedItems] = useState<ItemDetailResponse[]>([]);
  const [isLoadingOwnItems, setIsLoadingOwnItems] = useState(availableItems === undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [errorField, setErrorField] = useState<StockBatchErrorField | null>(null);
  const initialRequestedItemId =
    requestedItemId && /^\d+$/.test(requestedItemId) ? requestedItemId : "";
  const [formData, setFormData] = useState<FormValues>(() =>
    createInitialValues(initialRequestedItemId),
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  const errorSummaryRef = useRef<HTMLParagraphElement | null>(null);
  const items = availableItems ?? loadedItems;
  const isLoadingItems =
    availableItems === undefined ? isLoadingOwnItems : isLoadingAvailableItems;

  useEffect(() => {
    if (availableItems !== undefined) return;

    let isMounted = true;

    void api
      .get<ItemDetailResponse[]>("/items", { params: { is_active: true } })
      .then((response) => {
        if (!isMounted) return;
        setLoadedItems(response.data);

        if (
          requestedItemId &&
          !response.data.some((item) => String(item.id) === requestedItemId)
        ) {
          setError(
            "O item indicado não está disponível. Selecione um item válido para continuar.",
          );
          setErrorField("item_id");
        }
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setError(
          getApiErrorMessage(
            requestError,
            "Não foi possível carregar os itens para entrada de lote.",
          ),
        );
        setErrorField("form");
      })
      .finally(() => {
        if (isMounted) setIsLoadingOwnItems(false);
      });

    return () => {
      isMounted = false;
    };
  }, [availableItems, requestedItemId]);

  useEffect(() => {
    if (!error || !errorField || isLoadingItems) return;
    focusStockBatchError(formRef.current, errorSummaryRef.current, errorField);
  }, [error, errorField, isLoadingItems]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === Number(formData.item_id)) ?? null,
    [formData.item_id, items],
  );
  const requestedItemIsValid = Boolean(
    requestedItemId && items.some((item) => String(item.id) === requestedItemId),
  );

  function clearMessages() {
    setError("");
    setSuccess("");
    setErrorField(null);
  }

  function reportError(message: string, field: StockBatchErrorField) {
    setSuccess("");
    setError(message);
    setErrorField(field);
  }

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    clearMessages();
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === "item_id" ? { expiration_date: "" } : {}),
    }));
  }

  function handleReset() {
    clearMessages();
    setFormData(createInitialValues());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (!selectedItem) {
      reportError("Selecione um item válido.", "item_id");
      return;
    }

    const entryQuantity = Number(formData.entry_quantity);
    if (!Number.isInteger(entryQuantity) || entryQuantity < 1) {
      reportError(
        "Informe uma quantidade de entrada inteira e maior que zero.",
        "entry_quantity",
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

    if (formData.expiration_date && formData.expiration_date < formData.entry_date) {
      reportError(
        "A data de validade não pode ser anterior à data de entrada.",
        "expiration_date",
      );
      return;
    }

    if (
      (formData.status === "quarentena" || formData.status === "bloqueado") &&
      !formData.quarantine_reason.trim()
    ) {
      reportError(
        "Informe por que este lote não pode ser utilizado.",
        "quarantine_reason",
      );
      return;
    }

    const estimatedUnitValue = Number(formData.estimated_unit_value);
    if (!Number.isFinite(estimatedUnitValue) || estimatedUnitValue < 0) {
      reportError(
        "Informe um valor unitário estimado igual ou maior que zero.",
        "estimated_unit_value",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: StockBatchCreatePayload = {
        item_id: selectedItem.id,
        batch_code: formData.batch_code.trim() || null,
        source_type: formData.source_type,
        status: formData.status,
        entry_quantity: entryQuantity,
        entry_date: formData.entry_date,
        expiration_date: formData.expiration_date || null,
        storage_location: formData.storage_location.trim() || null,
        quarantine_reason:
          formData.status === "disponivel"
            ? null
            : formData.quarantine_reason.trim() || null,
        estimated_unit_value: estimatedUnitValue,
        notes: formData.notes.trim() || null,
      };

      const response = await api.post<StockBatchResponse>("/stock-batches", payload);

      if (onCreated) {
        onCreated(response.data);
        setFormData(createInitialValues());
        setSuccess("Entrada registrada. O histórico e o saldo do produto foram atualizados.");
      } else {
        navigate(`/items/${response.data.item_id}`, {
          state: {
            flash: {
              type: "success",
              message:
                "Entrada registrada com sucesso. O saldo foi atualizado; registre outra entrada se houver outro lote.",
            },
          },
        });
      }
    } catch (requestError) {
      reportError(
        getApiErrorMessage(
          requestError,
          "Não foi possível registrar a entrada do lote.",
        ),
        "form",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const cancelDestination =
    requestedItemId && requestedItemIsValid ? `/items/${requestedItemId}` : "/stock-batches";

  return (
    <section
      id="registrar-entrada"
      className={`${styles.panel} ${variant === "page" ? styles.pageVariant : ""}`}
      aria-labelledby="stock-batch-form-title"
    >
      <header className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true">
          <ArrowDownToLine />
        </span>
        <div>
          <h2 id="stock-batch-form-title">
            {variant === "page" ? "Dados do recebimento" : "Registrar entrada"}
          </h2>
          <p>Informe os dados do lote recebido para atualizar o estoque.</p>
        </div>
      </header>

      <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.fieldWide}>
          <span>Produto <b aria-hidden="true">*</b></span>
          <select
            name="item_id"
            aria-label="Item"
            value={formData.item_id}
            onChange={handleInputChange}
            disabled={isLoadingItems}
            required
            aria-invalid={errorField === "item_id"}
            aria-describedby={errorField === "item_id" ? "stock-batch-form-error" : undefined}
          >
            <option value="">
              {isLoadingItems ? "Carregando produtos…" : "Selecione um produto"}
            </option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.quantityRow}>
          <label>
            <span>Quantidade <b aria-hidden="true">*</b></span>
            <input
              type="number"
              min="1"
              name="entry_quantity"
              value={formData.entry_quantity}
              onChange={handleInputChange}
              required
              aria-invalid={errorField === "entry_quantity"}
              aria-describedby={errorField === "entry_quantity" ? "stock-batch-form-error" : undefined}
            />
          </label>
          <label>
            <span>Unidade</span>
            <input
              value={selectedItem?.unit_measure ?? "Selecione"}
              aria-label="Unidade do produto"
              readOnly
            />
          </label>
        </div>

        <label className={styles.fieldWide}>
          <span>Lote</span>
          <input
            name="batch_code"
            value={formData.batch_code}
            onChange={handleInputChange}
            maxLength={50}
            autoCapitalize="characters"
            aria-invalid={errorField === "batch_code"}
          />
        </label>

        <div className={styles.twoColumns}>
          <label>
            <span>Data de entrada <b aria-hidden="true">*</b></span>
            <input
              type="date"
              name="entry_date"
              value={formData.entry_date}
              onChange={handleInputChange}
              max={formatSaoPauloTodayForInput()}
              required
              aria-invalid={errorField === "entry_date"}
              aria-describedby={errorField === "entry_date" ? "stock-batch-form-error" : undefined}
            />
          </label>
          <label>
            <span>Validade {selectedItem?.tracks_expiration ? <b aria-hidden="true">*</b> : null}</span>
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
          </label>
        </div>
        <small id="expiration-date-help" className={styles.hint}>
          {!selectedItem
            ? "Selecione um produto para verificar o controle de validade."
            : selectedItem.tracks_expiration
              ? "Use a data impressa na embalagem deste lote."
              : "Este item não controla validade; nenhuma data será enviada."}
        </small>

        <label className={styles.fieldWide}>
          <span>Origem <b aria-hidden="true">*</b></span>
          <select name="source_type" value={formData.source_type} onChange={handleInputChange}>
            <option value="doacao_item">Doação de item</option>
            <option value="compra_igreja">Compra com recursos da instituição</option>
            <option value="conversao_dinheiro">Conversão de doação em dinheiro</option>
            <option value="ajuste">Ajuste de inventário</option>
          </select>
        </label>

        <details className={styles.details} open={variant === "page" || undefined}>
          <summary>
            Dados complementares
            <ChevronDown aria-hidden="true" />
          </summary>
          <div className={styles.detailsGrid}>
            <label>
              <span>Localização no estoque</span>
              <input
                name="storage_location"
                value={formData.storage_location}
                onChange={handleInputChange}
                maxLength={120}
                aria-invalid={errorField === "storage_location"}
              />
            </label>

            <label>
              <span>Situação física</span>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                aria-invalid={errorField === "status"}
              >
                <option value="disponivel">Disponível para uso</option>
                <option value="quarentena">Em quarentena</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </label>

            <label>
              <span>Valor unitário estimado</span>
              <input
                type="number"
                min="0"
                step="0.01"
                name="estimated_unit_value"
                value={formData.estimated_unit_value}
                onChange={handleInputChange}
                aria-invalid={errorField === "estimated_unit_value"}
              />
            </label>

            {formData.status === "quarentena" || formData.status === "bloqueado" ? (
              <label className={styles.fieldWide}>
                <span>Motivo da restrição <b aria-hidden="true">*</b></span>
                <textarea
                  name="quarantine_reason"
                  value={formData.quarantine_reason}
                  onChange={handleInputChange}
                  rows={3}
                  required
                  aria-invalid={errorField === "quarantine_reason"}
                />
              </label>
            ) : null}

            <label className={styles.fieldWide}>
              <span>Observações</span>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
              />
            </label>
          </div>
        </details>

        {!isLoadingItems && items.length === 0 ? (
          <p className={styles.errorMessage} role="alert">
            Nenhum item ativo está disponível. Cadastre um item antes de registrar a entrada.
          </p>
        ) : null}

        {error ? (
          <p
            ref={errorSummaryRef}
            id="stock-batch-form-error"
            className={styles.errorMessage}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            {error}
          </p>
        ) : null}

        {success ? (
          <p className={styles.successMessage} role="status" aria-live="polite">
            {success}
          </p>
        ) : null}

        <div className={styles.actions}>
          {onCreated ? (
            <button type="button" className={styles.secondaryButton} onClick={handleReset}>
              Limpar
            </button>
          ) : (
            <Link className={styles.secondaryButton} to={cancelDestination}>
              {cameFromItemCreation && requestedItemIsValid ? "Agora não, ver produto" : "Cancelar"}
            </Link>
          )}
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isSubmitting || isLoadingItems || items.length === 0 || !selectedItem}
          >
            {isSubmitting ? "Salvando…" : "Registrar entrada"}
          </button>
        </div>
      </form>
    </section>
  );
}
