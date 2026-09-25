import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, PackageSearch } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { ProductImage } from "../components/ProductImage";
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
import styles from "./StockMovementCreatePage.module.css";

const movementTypeOptions = [
  { value: "saida_manual", label: "Saída manual" },
  { value: "perda_validade", label: "Perda por validade" },
  { value: "ajuste_negativo", label: "Ajuste negativo" },
  { value: "ajuste_positivo", label: "Ajuste positivo" },
];

const movementTypeHelp: Record<string, string> = {
  saida_manual: "Retirada operacional de um lote disponível.",
  perda_validade: "Baixa de lote vencido ou sem validade obrigatória.",
  ajuste_negativo: "Correção auditada para reduzir o saldo.",
  ajuste_positivo: "Correção auditada para aumentar o saldo.",
};

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
      batch.status !== "disponivel" ||
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
  const [isDirty, setIsDirty] = useState(false);
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
              if (
                (first.status === "disponivel") !==
                (second.status === "disponivel")
              ) {
                return first.status === "disponivel" ? -1 : 1;
              }

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

  useEffect(() => {
    function protectUnsavedChanges(event: BeforeUnloadEvent) {
      if (!isDirty || isSubmitting) {
        return;
      }

      event.preventDefault();
    }

    window.addEventListener("beforeunload", protectUnsavedChanges);
    return () => window.removeEventListener("beforeunload", protectUnsavedChanges);
  }, [isDirty, isSubmitting]);

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

  const projectedQuantity = useMemo(() => {
    const quantity = Number(formData.quantity);

    if (
      !selectedBatch ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return null;
    }

    return formData.movement_type === "ajuste_positivo"
      ? selectedBatch.current_quantity + quantity
      : selectedBatch.current_quantity - quantity;
  }, [formData.movement_type, formData.quantity, selectedBatch]);

  const contextItem = selectedItem ?? requestedItem;

  const expirationToneClass = selectedExpirationStatus
    ? {
        danger: styles.statusDanger,
        warning: styles.statusWarning,
        success: styles.statusSuccess,
        neutral: styles.statusNeutral,
      }[selectedExpirationStatus.tone]
    : styles.statusNeutral;

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setIsDirty(true);

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

    if (
      formData.movement_type === "saida_manual" &&
      selectedBatch.status !== "disponivel"
    ) {
      reportError(
        "Este lote está em quarentena ou bloqueado. Libere sua situação física no detalhe do item antes da saída.",
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
      setIsDirty(false);
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

  function handleCancel(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      !isDirty ||
      window.confirm("Descartar as alterações desta movimentação?")
    ) {
      return;
    }

    event.preventDefault();
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Registrar movimentação</h1>
        <p>Atualize o saldo de um lote do estoque.</p>
      </header>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={styles.workspace}
        noValidate
      >
        <section className={styles.formCard} aria-labelledby="movement-data-title">
          <header className={styles.cardHeader}>
            <span className={styles.cardIcon} aria-hidden="true">
              <ArrowRightLeft />
            </span>
            <div>
              <h2 id="movement-data-title">Dados da movimentação</h2>
            </div>
          </header>

          <div className={styles.fields}>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Lote <b aria-hidden="true">*</b></span>
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
                      {batch.batch_code ?? `Lote legado #${batch.id}`} •{" "}
                      {batchItem?.name ?? `Item #${batch.item_id}`} •
                      Saldo {batch.current_quantity} • Validade {expirationLabel} •{" "}
                      {batchItem && !batchItem.is_active
                        ? "Item inativo"
                        : batch.status !== "disponivel"
                          ? batch.status === "quarentena"
                            ? "Em quarentena"
                            : "Bloqueado"
                        : !batchWasReceived
                          ? "Entrada futura"
                        : expirationStatus.label}
                    </option>
                  );
                })}
              </select>
              <small id="stock-batch-help">
                {formData.movement_type === "saida_manual"
                  ? "Lotes aptos aparecem em ordem FEFO."
                  : formData.movement_type === "perda_validade"
                    ? "Apenas lotes vencidos ou sem validade obrigatória."
                    : "Selecione o lote que receberá o ajuste."}
              </small>
            </label>

            <label className={styles.field}>
              <span>Tipo <b aria-hidden="true">*</b></span>
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
              <small id="movement-type-help">
                {movementTypeHelp[formData.movement_type]}
              </small>
            </label>

            <label className={styles.field}>
              <span>Quantidade <b aria-hidden="true">*</b></span>
              <div className={styles.quantityControl}>
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
                <span aria-hidden="true">
                  {selectedItem?.unit_measure ?? "un."}
                </span>
              </div>
            </label>

            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>
                {movementRequiresReason
                  ? "Motivo da movimentação"
                  : "Observações"}
                {movementRequiresReason ? <b aria-hidden="true"> *</b> : null}
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
                aria-describedby={
                  errorField === "notes"
                    ? "stock-movement-form-error"
                    : undefined
                }
              />
              {movementRequiresReason ? (
                <small>Obrigatório para perdas e ajustes.</small>
              ) : null}
            </label>
          </div>
        </section>

        <aside className={styles.summaryCard} aria-label="Resumo da movimentação">
          <header className={styles.summaryHeader}>
            <h2>Resumo</h2>
            <span className={selectedBatch ? styles.readyBadge : styles.waitingBadge}>
              {selectedBatch ? "Pronto para revisar" : "Aguardando lote"}
            </span>
          </header>

          {contextItem ? (
            <div className={styles.productIdentity}>
              <ProductImage
                name={contextItem.name}
                src={contextItem.image_path}
                size="card"
                eager
              />
              <div>
                <strong>{contextItem.name}</strong>
                <span>{contextItem.category_name}</span>
              </div>
            </div>
          ) : null}

          {selectedBatch ? (
            <>
              <dl className={styles.summaryDetails} aria-label="Situação do lote">
                <div>
                  <dt>Lote</dt>
                  <dd>{selectedBatch.batch_code ?? `Legado #${selectedBatch.id}`}</dd>
                </div>
                <div>
                  <dt>Saldo atual</dt>
                  <dd>{selectedBatch.current_quantity} {selectedItem?.unit_measure}</dd>
                </div>
                <div>
                  <dt>Validade</dt>
                  <dd>
                    {selectedBatch.expiration_date
                      ? formatDateOnly(selectedBatch.expiration_date)
                      : selectedItem?.tracks_expiration
                        ? "Não informada"
                        : "Não controlada"}
                  </dd>
                </div>
                <div>
                  <dt>Situação</dt>
                  <dd>
                    <span className={`${styles.statusBadge} ${expirationToneClass}`}>
                      {selectedExpirationStatus?.label ?? "Não avaliada"}
                    </span>
                  </dd>
                </div>
              </dl>

              <div
                className={`${styles.balancePreview} ${
                  projectedQuantity !== null && projectedQuantity < 0
                    ? styles.balanceInvalid
                    : ""
                }`}
                aria-label="Saldo após a movimentação"
              >
                <span>Saldo após movimento</span>
                <strong>
                  {projectedQuantity ?? "—"}
                  <small>{selectedItem?.unit_measure}</small>
                </strong>
                <p>{movementTypeOptions.find((option) => option.value === formData.movement_type)?.label}</p>
              </div>
            </>
          ) : (
            <div className={styles.summaryEmpty}>
              <PackageSearch aria-hidden="true" />
              <strong>Selecione um lote</strong>
              <span>O saldo projetado aparecerá aqui.</span>
            </div>
          )}
        </aside>

        {error ? (
          <p
            ref={errorSummaryRef}
            id="stock-movement-form-error"
            className={styles.error}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            {error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Link
            to="/items"
            className={styles.secondaryAction}
            onClick={handleCancel}
          >
            Cancelar
          </Link>

          <button
            type="submit"
            className={styles.primaryAction}
            disabled={
              isSubmitting ||
              isLoading ||
              !selectedBatch ||
              selectedBatchIsBlocked
            }
          >
            <ArrowRightLeft aria-hidden="true" />
            {isSubmitting ? "Salvando…" : "Registrar movimentação"}
          </button>
        </div>
      </form>
    </div>
  );
}
