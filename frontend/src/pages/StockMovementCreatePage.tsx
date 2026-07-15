import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateOnly } from "../utils/format";
import {
  compareStockBatchesByFefo,
  getBatchExpirationStatus,
  isStockBatchReceived,
} from "../utils/stock";
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

type StockMovementErrorField = "batch_id" | "quantity" | "notes" | "form";

function focusStockMovementError(
  form: HTMLFormElement | null,
  summary: HTMLParagraphElement | null,
  field: StockMovementErrorField
) {
  window.requestAnimationFrame(() => {
    const fieldControl =
      field === "form"
        ? null
        : form?.querySelector<HTMLElement>(`[name="${field}"]`);
    (fieldControl ?? summary)?.focus();
  });
}

function isExpirationLossEligible(
  batch: StockBatchResponse,
  item: ItemDetailResponse
): boolean {
  const expirationStatus = getBatchExpirationStatus(
    batch,
    item.tracks_expiration
  );

  return (
    expirationStatus.code === "expired" ||
    (item.tracks_expiration && expirationStatus.code === "missing")
  );
}

function isBatchBlockedForMovement(
  batch: StockBatchResponse,
  item: ItemDetailResponse | null | undefined,
  movementType: string
): boolean {
  if (!item) {
    return true;
  }

  if (!item.is_active) {
    return true;
  }

  if (movementType === "saida_manual") {
    return (
      !isStockBatchReceived(batch) ||
      getBatchExpirationStatus(batch, item.tracks_expiration).blocksManualExit
    );
  }

  if (movementType === "perda_validade") {
    return !isExpirationLossEligible(batch, item);
  }

  if (movementType === "ajuste_negativo") {
    return batch.current_quantity <= 0;
  }

  return false;
}

/**
 * Registro manual de movimentação de estoque.
 */
export function StockMovementCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedItemId = searchParams.get("itemId");

  const [items, setItems] = useState<ItemDetailResponse[]>([]);
  const [batches, setBatches] = useState<StockBatchResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errorField, setErrorField] =
    useState<StockMovementErrorField | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const errorSummaryRef = useRef<HTMLParagraphElement | null>(null);

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
        setErrorField(null);
        setFormData((previous) => ({ ...previous, batch_id: "" }));

        const requestedItemIdAsNumber = Number(requestedItemId);
        const canFilterByRequestedItem =
          requestedItemId !== null &&
          Number.isInteger(requestedItemIdAsNumber) &&
          requestedItemIdAsNumber > 0;

        const [itemsResponse, batchesResponse] = await Promise.all([
          api.get<ItemDetailResponse[]>("/items"),
          // A API filtra por item, mas ainda não por utilizabilidade/FEFO.
          // Status e ordenação permanecem no cliente até existir esse contrato.
          api.get<StockBatchResponse[]>("/stock-batches", {
            params: canFilterByRequestedItem
              ? { item_id: requestedItemIdAsNumber }
              : undefined,
          }),
        ]);

        if (!isMounted) {
          return;
        }

        setItems(itemsResponse.data);
        setBatches(batchesResponse.data);

        if (requestedItemId) {
          const requestedItem = itemsResponse.data.find(
            (item) => String(item.id) === requestedItemId
          );

          if (!requestedItem) {
            setError(
              "O item indicado não está disponível. Selecione um lote válido para continuar."
            );
            setErrorField("batch_id");
            return;
          }

          const firstBatch = batchesResponse.data
            .filter((batch) => batch.item_id === requestedItem.id)
            .toSorted((first, second) => {
              const firstStatus = getBatchExpirationStatus(
                first,
                requestedItem.tracks_expiration
              );
              const secondStatus = getBatchExpirationStatus(
                second,
                requestedItem.tracks_expiration
              );

              if (firstStatus.blocksManualExit !== secondStatus.blocksManualExit) {
                return firstStatus.blocksManualExit ? 1 : -1;
              }

              return compareStockBatchesByFefo(first, second);
            })
            .find(
              (batch) =>
                !isBatchBlockedForMovement(
                  batch,
                  requestedItem,
                  "saida_manual"
                )
            );

          if (firstBatch) {
            setFormData((previous) => ({
              ...previous,
              batch_id: String(firstBatch.id),
            }));
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(
            getApiErrorMessage(err, "Não foi possível carregar lotes e itens.")
          );
          setErrorField("form");
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
  }, [requestedItemId]);

  useEffect(() => {
    if (!error || !errorField || isLoading) {
      return;
    }

    focusStockMovementError(
      formRef.current,
      errorSummaryRef.current,
      errorField
    );
  }, [error, errorField, isLoading]);

  function reportError(message: string, field: StockMovementErrorField) {
    setError(message);
    setErrorField(field);
  }

  function clearError() {
    setError("");
    setErrorField(null);
  }

  const itemsById = useMemo(() => {
    return new Map(items.map((item) => [item.id, item]));
  }, [items]);

  const requestedItem = useMemo(() => {
    if (!requestedItemId) {
      return null;
    }

    return items.find((item) => String(item.id) === requestedItemId) ?? null;
  }, [items, requestedItemId]);

  const visibleBatches = useMemo(() => {
    const filteredBatches = requestedItemId
      ? requestedItem
        ? batches.filter((batch) => batch.item_id === requestedItem.id)
        : []
      : batches;

    return filteredBatches.toSorted((first, second) => {
      const firstItem = itemsById.get(first.item_id);
      const secondItem = itemsById.get(second.item_id);
      const firstIsBlocked = isBatchBlockedForMovement(
        first,
        firstItem,
        formData.movement_type
      );
      const secondIsBlocked = isBatchBlockedForMovement(
        second,
        secondItem,
        formData.movement_type
      );

      if (firstIsBlocked !== secondIsBlocked) {
        return firstIsBlocked ? 1 : -1;
      }

      return compareStockBatchesByFefo(first, second);
    });
  }, [
    batches,
    formData.movement_type,
    itemsById,
    requestedItem,
    requestedItemId,
  ]);

  const selectedBatch = useMemo(() => {
    return (
      visibleBatches.find((batch) => String(batch.id) === formData.batch_id) ??
      null
    );
  }, [formData.batch_id, visibleBatches]);

  const selectedItem = useMemo(() => {
    return selectedBatch ? itemsById.get(selectedBatch.item_id) ?? null : null;
  }, [itemsById, selectedBatch]);

  const selectedExpirationStatus = useMemo(() => {
    if (!selectedBatch || !selectedItem) {
      return null;
    }

    return getBatchExpirationStatus(
      selectedBatch,
      selectedItem.tracks_expiration
    );
  }, [selectedBatch, selectedItem]);

  const selectedBatchIsBlocked = useMemo(() => {
    if (!selectedBatch) {
      return true;
    }

    return isBatchBlockedForMovement(
      selectedBatch,
      selectedItem,
      formData.movement_type
    );
  }, [formData.movement_type, selectedBatch, selectedItem]);

  const movementRequiresReason = formData.movement_type !== "saida_manual";

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    if (name === "movement_type") {
      setFormData((previous) => {
        const currentBatch = visibleBatches.find(
          (batch) => String(batch.id) === previous.batch_id
        );
        const currentItem = currentBatch
          ? itemsById.get(currentBatch.item_id)
          : null;
        const mustClearBatch = Boolean(
          currentBatch &&
            isBatchBlockedForMovement(currentBatch, currentItem, value)
        );

        return {
          ...previous,
          movement_type: value,
          batch_id: mustClearBatch ? "" : previous.batch_id,
        };
      });
      clearError();
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

    if (!selectedBatch || !selectedItem) {
      reportError("Selecione um lote válido.", "batch_id");
      return;
    }

    const expirationStatus = getBatchExpirationStatus(
      selectedBatch,
      selectedItem.tracks_expiration
    );

    if (!selectedItem.is_active) {
      reportError(
        "Este item está inativo. Ative-o antes de registrar uma movimentação.",
        "batch_id"
      );
      return;
    }

    if (
      formData.movement_type === "saida_manual" &&
      !isStockBatchReceived(selectedBatch)
    ) {
      reportError(
        "Este lote ainda não pode sair porque a data de entrada está no futuro.",
        "batch_id"
      );
      return;
    }

    if (formData.movement_type === "saida_manual" && expirationStatus.blocksManualExit) {
      reportError(
        "Este lote não pode sair para consumo porque está vencido, sem validade obrigatória ou sem saldo. Use Perda por validade quando for descartá-lo.",
        "batch_id"
      );
      return;
    }

    if (
      formData.movement_type === "perda_validade" &&
      !isExpirationLossEligible(selectedBatch, selectedItem)
    ) {
      reportError(
        "Perda por validade só pode ser registrada para lote vencido ou para item que exige validade e está sem a data.",
        "batch_id"
      );
      return;
    }

    if (movementRequiresReason && !formData.notes.trim()) {
      reportError(
        "Informe o motivo da movimentação para manter a auditoria completa.",
        "notes"
      );
      return;
    }

    const quantity = Number(formData.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      reportError(
        "Informe uma quantidade inteira e maior que zero.",
        "quantity"
      );
      return;
    }

    if (
      formData.movement_type !== "ajuste_positivo" &&
      quantity > selectedBatch.current_quantity
    ) {
      reportError(
        "A quantidade não pode ser maior que o saldo atual do lote.",
        "quantity"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: StockMovementCreatePayload = {
        batch_id: selectedBatch.id,
        movement_type: formData.movement_type,
        quantity,
        notes: formData.notes.trim() || null,
      };

      const response = await api.post<StockMovementResponse>(
        "/stock-movements",
        payload
      );
      navigate(`/items/${response.data.item_id}`, {
        state: {
          flash: {
            type: "success",
            message: "Movimentação registrada com sucesso.",
          },
        },
      });
    } catch (err) {
      reportError(
        getApiErrorMessage(err, "Não foi possível registrar a movimentação."),
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
        title="Movimentação manual"
        description="Registre ajustes, perdas e saídas manuais sobre um lote específico."
      />

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="panel-card form-panel"
        noValidate
      >
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Registro</p>
            <h2>Dados da movimentação</h2>
          </div>
        </div>

        <div className="form-grid">
          <label className="form__group form__group--wide">
            <span>Lote</span>
            <select
              name="batch_id"
              aria-label="Lote"
              value={formData.batch_id}
              onChange={handleInputChange}
              disabled={isLoading}
              required
              aria-invalid={errorField === "batch_id"}
              aria-describedby={`stock-batch-help${
                errorField === "batch_id" ? " stock-movement-form-error" : ""
              }`}
            >
              <option value="">
                {isLoading ? "Carregando lotes…" : "Selecione o lote"}
              </option>
              {visibleBatches.map((batch) => {
                const batchItem = itemsById.get(batch.item_id);
                const expirationStatus = getBatchExpirationStatus(
                  batch,
                  batchItem?.tracks_expiration ?? true
                );
                const isBlocked = isBatchBlockedForMovement(
                  batch,
                  batchItem,
                  formData.movement_type
                );
                const batchWasReceived = isStockBatchReceived(batch);
                const expirationLabel = batch.expiration_date
                  ? formatDateOnly(batch.expiration_date)
                  : batchItem?.tracks_expiration
                    ? "não informada"
                    : "não controlada";

                return (
                  <option
                    key={batch.id}
                    value={batch.id}
                    disabled={isBlocked}
                  >
                    Lote #{batch.id} • {batchItem?.name ?? `Item #${batch.item_id}`} •
                    Saldo {batch.current_quantity} • Validade {expirationLabel} •{" "}
                    {batchItem && !batchItem.is_active
                      ? "Item inativo"
                      : !batchWasReceived
                        ? "Entrada futura"
                      : expirationStatus.label}
                  </option>
                );
              })}
            </select>
            <small id="stock-batch-help" className="form__hint">
              {formData.movement_type === "saida_manual"
                ? "Para saída manual, lotes utilizáveis aparecem primeiro em ordem de validade (FEFO). Lotes com entrada futura, vencidos ou sem validade obrigatória ficam bloqueados."
                : formData.movement_type === "perda_validade"
                  ? "Somente lotes vencidos ou sem a validade obrigatória podem ser selecionados para descarte."
                  : "Selecione o lote que receberá o ajuste de saldo."}
            </small>
          </label>

          <label className="form__group">
            <span>Tipo</span>
            <select
              name="movement_type"
              aria-label="Tipo"
              value={formData.movement_type}
              onChange={handleInputChange}
              aria-describedby="movement-type-help"
            >
              {movementTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small id="movement-type-help" className="form__hint">
              Use Perda por validade para descartar um lote vencido ou sem a data
              quando ela era obrigatória.
            </small>
          </label>

          <label className="form__group">
            <span>Quantidade</span>
            <input
              type="number"
              min="1"
              max={
                formData.movement_type === "ajuste_positivo"
                  ? undefined
                  : selectedBatch?.current_quantity
              }
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              required
              aria-invalid={errorField === "quantity"}
              aria-describedby={
                errorField === "quantity"
                  ? "stock-movement-form-error"
                  : undefined
              }
            />
          </label>

          <label className="form__group form__group--wide">
            <span>
              {movementRequiresReason
                ? "Motivo da movimentação"
                : "Observações"}
            </span>
            <textarea
              name="notes"
              aria-label={
                movementRequiresReason
                  ? "Motivo da movimentação"
                  : "Observações"
              }
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              required={movementRequiresReason}
              aria-invalid={errorField === "notes"}
              aria-describedby={`movement-notes-help${
                errorField === "notes" ? " stock-movement-form-error" : ""
              }`}
              placeholder={
                movementRequiresReason
                  ? "Descreva por que o saldo será alterado."
                  : "Informação opcional para a auditoria."
              }
            />
            <small id="movement-notes-help" className="form__hint">
              {movementRequiresReason
                ? "Obrigatório para perdas e ajustes. O motivo ficará registrado na auditoria."
                : "Opcional para saída manual."}
            </small>
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
                  ? formatDateOnly(selectedBatch.expiration_date)
                  : selectedItem?.tracks_expiration
                    ? "Não informada"
                    : "Não controlada"}
              </strong>
            </div>
            <div className="detail-item">
              <span>Situação da validade</span>
              <strong>
                {selectedExpirationStatus ? (
                  <span
                    className={`pill${
                      selectedExpirationStatus.tone === "neutral"
                        ? ""
                        : ` pill--${selectedExpirationStatus.tone}`
                    }`}
                  >
                    {selectedExpirationStatus.label}
                  </span>
                ) : (
                  "Não avaliada"
                )}
              </strong>
            </div>
          </div>
        ) : null}

        {error ? (
          <p
            ref={errorSummaryRef}
            id="stock-movement-form-error"
            className="status-error"
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            {error}
          </p>
        ) : null}

        <div className="panel-actions panel-actions--spread">
          <Link to="/items" className="button button--secondary button--link">
            Cancelar
          </Link>

          <button
            type="submit"
            className="button"
            disabled={
              isSubmitting ||
              isLoading ||
              !selectedBatch ||
              selectedBatchIsBlocked
            }
          >
            {isSubmitting ? "Salvando…" : "Registrar movimentação"}
          </button>
        </div>
      </form>
    </div>
  );
}
