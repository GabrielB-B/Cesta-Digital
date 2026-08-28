import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  Barcode,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Edit3,
  History,
  MapPin,
  PackageCheck,
  Save,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { ProductImage } from "../components/ProductImage";
import {
  ProductImagePicker,
  type ProductImageSelection,
} from "../components/ProductImagePicker";
import type {
  ItemCategoryResponse,
  ItemDetailResponse,
  ItemUpdatePayload,
  StockBatchMetadataUpdatePayload,
  StockBatchResponse,
  StockBatchStatus,
  StockMovementResponse,
  StockSummaryResponse,
} from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";
import { formatCurrency, formatDateOnly } from "../utils/format";
import { persistProductImageSelection } from "../utils/product-image";
import {
  formatStockMovementType,
  formatStockSourceType,
  getBatchExpirationStatus,
  isStockBatchReceived,
} from "../utils/stock";
import styles from "./ItemDetailPage.module.css";

type BatchMetadataDraft = {
  batch_code: string;
  status: StockBatchStatus;
  storage_location: string;
  quarantine_reason: string;
  notes: string;
};

type ItemEditDraft = {
  category_id: string;
  name: string;
  barcode: string;
  unit_measure: string;
  tracks_expiration: boolean;
  is_active: boolean;
  reference_unit_value: string;
  minimum_stock_alert: string;
  notes: string;
};

function toBatchMetadataDraft(batch: StockBatchResponse): BatchMetadataDraft {
  return {
    batch_code: batch.batch_code ?? "",
    status: batch.status,
    storage_location: batch.storage_location ?? "",
    quarantine_reason: batch.quarantine_reason ?? "",
    notes: batch.notes ?? "",
  };
}

function toItemEditDraft(item: ItemDetailResponse): ItemEditDraft {
  return {
    category_id: String(item.category_id),
    name: item.name,
    barcode: item.barcode ?? "",
    unit_measure: item.unit_measure,
    tracks_expiration: item.tracks_expiration,
    is_active: item.is_active,
    reference_unit_value: String(item.reference_unit_value),
    minimum_stock_alert: String(item.minimum_stock_alert),
    notes: item.notes ?? "",
  };
}

function formatBatchStatus(status: StockBatchStatus): string {
  if (status === "quarentena") return "Em quarentena";
  if (status === "bloqueado") return "Bloqueado";
  return "Disponível";
}

export function ItemDetailPage() {
  const { itemId } = useParams();
  const [item, setItem] = useState<ItemDetailResponse | null>(null);
  const [summary, setSummary] = useState<StockSummaryResponse | null>(null);
  const [batches, setBatches] = useState<StockBatchResponse[]>([]);
  const [movements, setMovements] = useState<StockMovementResponse[]>([]);
  const [categories, setCategories] = useState<ItemCategoryResponse[]>([]);
  const [batchDrafts, setBatchDrafts] = useState<Record<number, BatchMetadataDraft>>(
    {}
  );
  const [editForm, setEditForm] = useState({
    category_id: "",
    name: "",
    barcode: "",
    unit_measure: "unidade",
    tracks_expiration: true,
    is_active: true,
    reference_unit_value: "0",
    minimum_stock_alert: "0",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isSavingBatchId, setIsSavingBatchId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [imageSelection, setImageSelection] = useState<ProductImageSelection>({
    kind: "unchanged",
  });
  const editButtonRef = useRef<HTMLButtonElement | null>(null);
  const editorHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadItemDetail() {
      try {
        setIsLoading(true);
        setError("");
        const parsedItemId = Number(itemId);

        const [
          itemResponse,
          summaryResponse,
          batchesResponse,
          movementsResponse,
          categoriesResponse,
        ] = await Promise.all([
          api.get<ItemDetailResponse>(`/items/${itemId}`),
          api.get<StockSummaryResponse[]>("/stock-summary", {
            params: { limit: 200 },
          }),
          api.get<StockBatchResponse[]>("/stock-batches", {
            params: { item_id: parsedItemId, limit: 100 },
          }),
          api.get<StockMovementResponse[]>("/stock-movements", {
            params: { item_id: parsedItemId, limit: 100 },
          }),
          api.get<ItemCategoryResponse[]>("/item-categories"),
        ]);

        if (!isMounted) {
          return;
        }

        const loadedItem = itemResponse.data;

        setItem(loadedItem);
        setSummary(
          summaryResponse.data.find((entry) => entry.item_id === parsedItemId) ??
            null
        );
        setBatches(batchesResponse.data);
        setBatchDrafts(
          Object.fromEntries(
            batchesResponse.data.map((batch) => [batch.id, toBatchMetadataDraft(batch)])
          )
        );
        setMovements(movementsResponse.data);
        setCategories(categoriesResponse.data);
        setEditForm(toItemEditDraft(loadedItem));
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, "Não foi possível carregar o item."));
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

  const usableCurrentQuantity = useMemo(() => {
    if (!item?.is_active) {
      return 0;
    }

    return batches.reduce((total, batch) => {
      if (!isStockBatchReceived(batch) || batch.status !== "disponivel") {
        return total;
      }

      const status = getBatchExpirationStatus(
        batch,
        item?.tracks_expiration ?? true
      );

      return status.blocksManualExit ? total : total + batch.current_quantity;
    }, 0);
  }, [batches, item?.is_active, item?.tracks_expiration]);

  const criticalBatchCount = useMemo(() => {
    return batches.filter((batch) =>
      getBatchExpirationStatus(batch, item?.tracks_expiration ?? false).isCritical
    ).length;
  }, [batches, item?.tracks_expiration]);

  const futureBatchCount = useMemo(() => {
    return batches.filter((batch) => !isStockBatchReceived(batch)).length;
  }, [batches]);

  const restrictedBatchCount = useMemo(
    () => batches.filter((batch) => batch.status !== "disponivel").length,
    [batches]
  );
  const batchCodeById = useMemo(
    () =>
      new Map(
        batches.map((batch) => [
          batch.id,
          batch.batch_code ?? `Lote legado #${batch.id}`,
        ])
      ),
    [batches]
  );

  const displayedUsableQuantity = item?.is_active
    ? summary?.total_quantity ?? usableCurrentQuantity
    : 0;

  const nextUsableExpiration = useMemo(() => {
    if (!item?.tracks_expiration) return null;

    return (
      batches
        .filter((batch) => {
          if (
            batch.status !== "disponivel" ||
            batch.current_quantity <= 0 ||
            !batch.expiration_date ||
            !isStockBatchReceived(batch)
          ) {
            return false;
          }

          return !getBatchExpirationStatus(batch, true).blocksManualExit;
        })
        .map((batch) => batch.expiration_date)
        .filter((date): date is string => Boolean(date))
        .toSorted()[0] ?? null
    );
  }, [batches, item?.tracks_expiration]);

  const isBelowMinimum = Boolean(
    item?.is_active && displayedUsableQuantity <= item.minimum_stock_alert
  );

  const isEditDirty = useMemo(() => {
    if (!item) return false;
    return (
      JSON.stringify(editForm) !== JSON.stringify(toItemEditDraft(item)) ||
      imageSelection.kind !== "unchanged"
    );
  }, [editForm, imageSelection.kind, item]);

  useEffect(() => {
    if (!isEditorOpen || !isEditDirty) return;

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isEditDirty, isEditorOpen]);

  function openEditor() {
    setError("");
    setSuccessMessage("");
    setIsEditorOpen(true);
    window.requestAnimationFrame(() => {
      editorHeadingRef.current?.focus();
      editorHeadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function closeEditor() {
    if (
      isEditDirty &&
      !window.confirm("Descartar as alterações ainda não salvas?")
    ) {
      return;
    }

    if (item) setEditForm(toItemEditDraft(item));
    setImageSelection({ kind: "unchanged" });
    setError("");
    setIsEditorOpen(false);
    window.requestAnimationFrame(() => editButtonRef.current?.focus());
  }

  function formatDate(value: string | null): string {
    if (!value) {
      return "Não informada";
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
        barcode: editForm.barcode.trim() || null,
        unit_measure: editForm.unit_measure,
        tracks_expiration: editForm.tracks_expiration,
        is_active: editForm.is_active,
        reference_unit_value: Number(editForm.reference_unit_value),
        minimum_stock_alert: Number(editForm.minimum_stock_alert),
        notes: editForm.notes.trim() || null,
      };

      const response = await api.put<ItemDetailResponse>(`/items/${itemId}`, payload);
      let updatedItem = response.data;

      try {
        await persistProductImageSelection(response.data.id, imageSelection);
        if (imageSelection.kind !== "unchanged") {
          const refreshedItem = await api.get<ItemDetailResponse>(`/items/${itemId}`);
          updatedItem = refreshedItem.data;
        }
      } catch (imageError) {
        setItem(response.data);
        setError(
          `Os dados do produto foram salvos, mas a imagem não foi atualizada. ${getApiErrorMessage(
            imageError,
            "Tente novamente.",
          )}`,
        );
        return;
      }

      setSummary(null);
      setItem(updatedItem);
      setImageSelection({ kind: "unchanged" });
      setEditForm(toItemEditDraft(updatedItem));

      try {
        const summaryResponse = await api.get<StockSummaryResponse[]>(
          "/stock-summary",
          { params: { limit: 200 } }
        );
        setSummary(
          summaryResponse.data.find(
            (entry) => entry.item_id === updatedItem.id
          ) ?? null
        );
      } catch {
        // O fallback local já aplica a política de saldo utilizável aos lotes.
        setSummary(null);
      }

      setSuccessMessage("Produto atualizado.");
      setIsEditorOpen(false);
      window.requestAnimationFrame(() => editButtonRef.current?.focus());
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível salvar o item."));
    } finally {
      setIsSavingItem(false);
    }
  }

  async function handleBatchMetadataSave(
    event: React.FormEvent<HTMLFormElement>,
    batchId: number
  ) {
    event.preventDefault();
    const draft = batchDrafts[batchId];
    if (!draft) return;

    if (
      (draft.status === "quarentena" || draft.status === "bloqueado") &&
      !draft.quarantine_reason.trim()
    ) {
      setError("Informe o motivo da quarentena ou do bloqueio do lote.");
      return;
    }

    try {
      setIsSavingBatchId(batchId);
      setError("");
      setSuccessMessage("");

      const payload: StockBatchMetadataUpdatePayload = {
        batch_code: draft.batch_code.trim() || null,
        status: draft.status,
        storage_location: draft.storage_location.trim() || null,
        quarantine_reason:
          draft.status === "disponivel"
            ? null
            : draft.quarantine_reason.trim() || null,
        notes: draft.notes.trim() || null,
      };
      const response = await api.patch<StockBatchResponse>(
        `/stock-batches/${batchId}/metadata`,
        payload
      );

      setBatches((current) =>
        current.map((batch) => (batch.id === batchId ? response.data : batch))
      );
      setBatchDrafts((current) => ({
        ...current,
        [batchId]: toBatchMetadataDraft(response.data),
      }));

      try {
        const summaryResponse = await api.get<StockSummaryResponse[]>(
          "/stock-summary",
          { params: { limit: 200 } }
        );
        setSummary(
          summaryResponse.data.find(
            (entry) => entry.item_id === response.data.item_id
          ) ?? null
        );
      } catch {
        setSummary(null);
      }

      setSuccessMessage(
        `Rastreabilidade do lote ${response.data.batch_code} atualizada.`
      );
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Não foi possível atualizar os dados do lote.")
      );
    } finally {
      setIsSavingBatchId(null);
    }
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState} role="status" aria-live="polite">
          <span className={styles.loadingIcon}>
            <PackageCheck aria-hidden="true" />
          </span>
          <strong>Carregando produto…</strong>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState} role="alert">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>Não foi possível abrir o produto</strong>
            <span>{error || "Tente novamente em alguns instantes."}</span>
          </div>
          <Link to="/items">Voltar ao estoque</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Link to="/items" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" /> Estoque
        </Link>

        <div className={styles.headerRow}>
          <div className={styles.productIdentity}>
            <ProductImage name={item.name} src={item.image_path} size="detail" eager />
            <div>
              <span
                className={`${styles.statusBadge} ${
                  item.is_active ? styles.statusActive : styles.statusInactive
                }`}
              >
                {item.is_active ? "Ativo" : "Inativo"}
              </span>
              <h1>{item.name}</h1>
              <p>
                {item.category_name} <span aria-hidden="true">·</span>{" "}
                {item.unit_measure}
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              ref={editButtonRef}
              type="button"
              className={styles.secondaryAction}
              onClick={openEditor}
              aria-expanded={isEditorOpen}
              aria-controls="item-editor"
            >
              <Edit3 aria-hidden="true" /> Editar produto
            </button>
            {item.is_active ? (
              <Link
                className={styles.primaryAction}
                to={`/stock-batches/new?itemId=${item.id}`}
              >
                <ArrowDownToLine aria-hidden="true" /> Registrar entrada
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {error ? (
        <p className={styles.feedbackError} role="alert">{error}</p>
      ) : null}
      {successMessage ? (
        <p className={styles.feedbackSuccess} role="status">{successMessage}</p>
      ) : null}

      <section className={styles.overview} aria-label="Resumo do produto">
        <article className={styles.balancePanel}>
          <div className={styles.balanceHeading}>
            <span className={styles.balanceIcon}>
              <Boxes aria-hidden="true" />
            </span>
            <div>
              <span>Saldo utilizável</span>
              <strong>
                {displayedUsableQuantity} <small>{item.unit_measure}</small>
              </strong>
            </div>
            <span
              className={`${styles.stockBadge} ${
                isBelowMinimum ? styles.stockWarning : styles.stockGood
              }`}
            >
              {item.is_active
                ? isBelowMinimum
                  ? "Estoque baixo"
                  : "Disponível"
                : "Produto inativo"}
            </span>
          </div>
          <dl className={styles.balanceFacts}>
            <div>
              <dt>Estoque mínimo</dt>
              <dd>{item.minimum_stock_alert} {item.unit_measure}</dd>
            </div>
            <div>
              <dt>Lotes cadastrados</dt>
              <dd>{summary?.total_batches ?? batches.length}</dd>
            </div>
            <div>
              <dt>Próxima validade</dt>
              <dd>{nextUsableExpiration ? formatDateOnly(nextUsableExpiration) : "Não aplicável"}</dd>
            </div>
          </dl>
        </article>

        <article className={styles.registrationPanel}>
          <div className={styles.sectionHeading}>
            <div><h2>Cadastro do produto</h2></div>
            <Tag aria-hidden="true" />
          </div>
          <dl className={styles.registrationFacts}>
            <div>
              <dt><Barcode aria-hidden="true" /> Código de barras</dt>
              <dd>{item.barcode || "Não informado"}</dd>
            </div>
            <div>
              <dt><CalendarDays aria-hidden="true" /> Validade</dt>
              <dd>{item.tracks_expiration ? "Controlada por lote" : "Não controlada"}</dd>
            </div>
            <div>
              <dt><CircleDollarSign aria-hidden="true" /> Valor de referência</dt>
              <dd>{formatCurrency(item.reference_unit_value)}</dd>
            </div>
          </dl>
          {item.notes ? <p className={styles.productNote}>{item.notes}</p> : null}
          {item.image_attribution ? (
            <small className={styles.imageAttribution}>{item.image_attribution}</small>
          ) : null}
        </article>

      </section>

      {criticalBatchCount > 0 || futureBatchCount > 0 || restrictedBatchCount > 0 ? (
        <section className={styles.attentionPanel} aria-label="Atenção operacional">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>Atenção operacional</strong>
            <ul>
              {criticalBatchCount > 0 ? (
                <li>{criticalBatchCount} lote{criticalBatchCount > 1 ? "s" : ""} com validade crítica</li>
              ) : null}
              {futureBatchCount > 0 ? (
                <li>{futureBatchCount} lote{futureBatchCount > 1 ? "s" : ""} com entrada futura</li>
              ) : null}
              {restrictedBatchCount > 0 ? (
                <li>{restrictedBatchCount} lote{restrictedBatchCount > 1 ? "s" : ""} restrito{restrictedBatchCount > 1 ? "s" : ""}</li>
              ) : null}
            </ul>
          </div>
        </section>
      ) : null}

      {isEditorOpen ? (
        <section id="item-editor" className={styles.editorPanel} aria-labelledby="item-editor-title">
          <div className={styles.editorHeader}>
            <div>
              <h2 id="item-editor-title" ref={editorHeadingRef} tabIndex={-1}>Editar produto</h2>
              <p>Dados do catálogo e identificação visual.</p>
            </div>
            <button type="button" onClick={closeEditor} aria-label="Fechar edição">
              <X aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleItemSave} className={styles.editorForm}>
            <div className={styles.formGrid}>
            <label className={styles.field}>
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

            <label className={styles.field}>
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

            <label className={styles.field}>
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

            <label className={styles.field}>
              <span>Valor de referência</span>
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

            <label className={styles.field}>
              <span>Alerta mínimo</span>
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

            <label className={styles.switchField}>
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
              <span>
                <strong>Controla validade por lote</strong>
              </span>
              <i aria-hidden="true" />
            </label>

            <label className={styles.switchField}>
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
              <span><strong>Produto ativo</strong></span>
              <i aria-hidden="true" />
            </label>

            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Observações <small>(opcional)</small></span>
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
            </div>

            <ProductImagePicker
              productName={editForm.name}
              barcode={editForm.barcode}
              onBarcodeChange={(barcode) =>
                setEditForm((previous) => ({ ...previous, barcode }))
              }
              selection={imageSelection}
              onSelectionChange={setImageSelection}
              currentImagePath={item.image_path}
              currentImageSource={item.image_source}
              currentImageAttribution={item.image_attribution}
              disabled={isSavingItem}
            />

            <div className={styles.formActions}>
              <button type="button" onClick={closeEditor} disabled={isSavingItem}>
                Cancelar
              </button>
              <button type="submit" className={styles.saveButton} disabled={isSavingItem}>
                <Save aria-hidden="true" /> {isSavingItem ? "Salvando…" : "Salvar produto"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className={styles.operationalGrid}>
        <article className={styles.sectionPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Lotes</h2>
              <span>{batches.length} cadastrado{batches.length === 1 ? "" : "s"}</span>
            </div>
            <Boxes aria-hidden="true" />
          </div>

          {batches.length === 0 ? (
            <div className={styles.emptyState}>
              <PackageCheck aria-hidden="true" />
              <strong>Nenhum lote registrado</strong>
              <span>O saldo será exibido após a primeira entrada.</span>
            </div>
          ) : (
            <div className={styles.batchList} aria-label="Lotes do item">
              {batches.map((batch) => {
                const batchWasReceived = isStockBatchReceived(batch);
                const expirationStatus = getBatchExpirationStatus(
                  batch,
                  item.tracks_expiration
                );
                const draft = batchDrafts[batch.id] ?? toBatchMetadataDraft(batch);
                const statusTone =
                  batch.status === "disponivel"
                    ? styles.batchAvailable
                    : batch.status === "quarentena"
                      ? styles.batchQuarantine
                      : styles.batchBlocked;
                const batchName = batch.batch_code ?? `Lote legado #${batch.id}`;

                return (
                  <article
                    className={styles.batchCard}
                    key={batch.id}
                    aria-label={`Lote ${batchName}`}
                  >
                    <div className={styles.batchHeader}>
                      <div>
                        <span>Lote</span>
                        <h3>{batchName}</h3>
                      </div>
                      <span className={`${styles.statusBadge} ${statusTone}`}>
                        {formatBatchStatus(batch.status)}
                      </span>
                    </div>

                    <dl className={styles.batchFacts}>
                      <div>
                        <dt>Saldo</dt>
                        <dd>
                          {batch.current_quantity} de {batch.entry_quantity}{" "}
                          {item.unit_measure}
                        </dd>
                      </div>
                      <div>
                        <dt><MapPin aria-hidden="true" /> Localização</dt>
                        <dd>{batch.storage_location ?? "Não informada"}</dd>
                      </div>
                      <div>
                        <dt>Recebimento</dt>
                        <dd>{formatDate(batch.entry_date)}</dd>
                      </div>
                      <div>
                        <dt>Validade</dt>
                        <dd>{formatDate(batch.expiration_date)}</dd>
                      </div>
                    </dl>

                    <div className={styles.batchSignals}>
                      <span
                        className={`${styles.expirationBadge} ${
                          !batchWasReceived
                            ? styles.expirationDanger
                            : expirationStatus.tone === "danger"
                              ? styles.expirationDanger
                              : expirationStatus.tone === "warning"
                                ? styles.expirationWarning
                                : styles.expirationNeutral
                        }`}
                      >
                        {batchWasReceived ? expirationStatus.label : "Entrada futura"}
                      </span>
                      <span>{formatStockSourceType(batch.source_type)}</span>
                    </div>

                    {batch.quarantine_reason ? (
                      <p className={styles.restriction}>
                        <ShieldCheck aria-hidden="true" />
                        <span><strong>Restrito:</strong> {batch.quarantine_reason}</span>
                      </p>
                    ) : null}

                    <details className={styles.batchEditor}>
                      <summary>Editar rastreabilidade</summary>
                      <form
                        onSubmit={(event) =>
                          void handleBatchMetadataSave(event, batch.id)
                        }
                      >
                        <label className={styles.field}>
                          <span>Código do lote</span>
                          <input
                            value={draft.batch_code}
                            maxLength={50}
                            onChange={(event) =>
                              setBatchDrafts((current) => ({
                                ...current,
                                [batch.id]: {
                                  ...draft,
                                  batch_code: event.target.value,
                                },
                              }))
                            }
                            required
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Situação física</span>
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              setBatchDrafts((current) => ({
                                ...current,
                                [batch.id]: {
                                  ...draft,
                                  status: event.target.value as StockBatchStatus,
                                },
                              }))
                            }
                          >
                            <option value="disponivel">Disponível</option>
                            <option value="quarentena">Em quarentena</option>
                            <option value="bloqueado">Bloqueado</option>
                          </select>
                        </label>
                        <label className={styles.field}>
                          <span>Localização <small>(opcional)</small></span>
                          <input
                            value={draft.storage_location}
                            maxLength={120}
                            onChange={(event) =>
                              setBatchDrafts((current) => ({
                                ...current,
                                [batch.id]: {
                                  ...draft,
                                  storage_location: event.target.value,
                                },
                              }))
                            }
                          />
                        </label>
                        {draft.status !== "disponivel" ? (
                          <label className={styles.field}>
                            <span>Motivo da restrição</span>
                            <input
                              value={draft.quarantine_reason}
                              onChange={(event) =>
                                setBatchDrafts((current) => ({
                                  ...current,
                                  [batch.id]: {
                                    ...draft,
                                    quarantine_reason: event.target.value,
                                  },
                                }))
                              }
                              required
                            />
                          </label>
                        ) : null}
                        <label className={`${styles.field} ${styles.fieldWide}`}>
                          <span>Observações <small>(opcional)</small></span>
                          <textarea
                            value={draft.notes}
                            rows={2}
                            onChange={(event) =>
                              setBatchDrafts((current) => ({
                                ...current,
                                [batch.id]: { ...draft, notes: event.target.value },
                              }))
                            }
                          />
                        </label>
                        <div className={styles.batchEditorActions}>
                          <button
                            type="submit"
                            disabled={isSavingBatchId === batch.id}
                          >
                            {isSavingBatchId === batch.id
                              ? "Salvando…"
                              : "Salvar rastreabilidade"}
                          </button>
                        </div>
                      </form>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </article>

        <article className={styles.sectionPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Histórico</h2>
              <span>{movements.length} movimentação{movements.length === 1 ? "" : "ões"}</span>
            </div>
            {item.is_active ? (
              <Link
                className={styles.contextAction}
                to={`/stock-movements/new?itemId=${item.id}`}
              >
                Ajustar saldo
              </Link>
            ) : (
              <History aria-hidden="true" />
            )}
          </div>

          {movements.length === 0 ? (
            <div className={styles.emptyState}>
              <History aria-hidden="true" />
              <strong>Sem movimentações</strong>
              <span>Entradas e ajustes aparecerão aqui.</span>
            </div>
          ) : (
            <>
              <div className={styles.movementTable}>
                <table aria-label="Histórico de movimentações do item">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Lote</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatStockMovementType(movement.movement_type)}</td>
                      <td><strong>{movement.quantity} {item.unit_measure}</strong></td>
                      <td>
                        {batchCodeById.get(movement.batch_id) ?? `#${movement.batch_id}`}
                      </td>
                      <td>{movement.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              <div className={styles.movementList} aria-label="Histórico de movimentações do item">
                {movements.map((movement) => (
                  <article key={movement.id}>
                    <div>
                      <strong>{formatStockMovementType(movement.movement_type)}</strong>
                      <span>{batchCodeById.get(movement.batch_id) ?? `Lote #${movement.batch_id}`}</span>
                    </div>
                    <b>{movement.quantity} {item.unit_measure}</b>
                    {movement.notes ? <p>{movement.notes}</p> : null}
                  </article>
                ))}
              </div>
            </>
          )}
        </article>
      </section>
    </div>
  );
}
