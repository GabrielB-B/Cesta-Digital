import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, CircleAlert, PackagePlus, Save, ShoppingBasket, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { ProductImage } from "../components/ProductImage";
import type { BasketAvailabilityResponse, BasketTypeDetailResponse, BasketTypeItemCreatePayload } from "../types/basket";
import type { ItemDetailResponse } from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";
import styles from "./BasketTypeEditorPage.module.css";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatUnit(unit: string) {
  const labels: Record<string, string> = { unidade: "un.", pacote: "pct.", kg: "kg", litro: "L", caixa: "cx.", frasco: "fr." };
  return labels[unit] ?? unit;
}

export function BasketTypeDetailPage() {
  const { basketTypeId } = useParams();
  const [basketType, setBasketType] = useState<BasketTypeDetailResponse | null>(null);
  const [availability, setAvailability] = useState<BasketAvailabilityResponse | null>(null);
  const [items, setItems] = useState<ItemDetailResponse[]>([]);
  const [basketForm, setBasketForm] = useState({ name: "", is_active: true, notes: "" });
  const [recipeForm, setRecipeForm] = useState({ item_id: "", required_quantity: 1 });
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBasket, setIsSavingBasket] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [recipeError, setRecipeError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData(targetId: string) {
    try {
      const [detailResponse, availabilityResponse, itemsResponse] = await Promise.all([
        api.get<BasketTypeDetailResponse>(`/basket-types/${targetId}`),
        api.get<BasketAvailabilityResponse>(`/basket-types/${targetId}/availability`),
        api.get<ItemDetailResponse[]>("/items", { params: { is_active: true, limit: 200 } }),
      ]);
      setBasketType(detailResponse.data);
      setAvailability(availabilityResponse.data);
      setItems(itemsResponse.data);
      setBasketForm({ name: detailResponse.data.name, is_active: detailResponse.data.is_active, notes: detailResponse.data.notes ?? "" });
      setQuantityDrafts(Object.fromEntries(detailResponse.data.basket_items.map((item) => [item.item_id, String(item.required_quantity)])));
      setError("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Não foi possível carregar a cesta."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!basketTypeId) return;
    let isCurrent = true;
    void Promise.all([
      api.get<BasketTypeDetailResponse>(`/basket-types/${basketTypeId}`),
      api.get<BasketAvailabilityResponse>(`/basket-types/${basketTypeId}/availability`),
      api.get<ItemDetailResponse[]>("/items", { params: { is_active: true, limit: 200 } }),
    ]).then(([detailResponse, availabilityResponse, itemsResponse]) => {
      if (!isCurrent) return;
      setBasketType(detailResponse.data);
      setAvailability(availabilityResponse.data);
      setItems(itemsResponse.data);
      setBasketForm({ name: detailResponse.data.name, is_active: detailResponse.data.is_active, notes: detailResponse.data.notes ?? "" });
      setQuantityDrafts(Object.fromEntries(detailResponse.data.basket_items.map((item) => [item.item_id, String(item.required_quantity)])));
      setError("");
    }).catch((requestError) => {
      if (isCurrent) setError(getApiErrorMessage(requestError, "Não foi possível carregar a cesta."));
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });
    return () => { isCurrent = false; };
  }, [basketTypeId]);

  const availableItems = useMemo(() => {
    const existingIds = new Set(basketType?.basket_items.map((item) => item.item_id) ?? []);
    return items.filter((item) => !existingIds.has(item.id));
  }, [basketType, items]);

  const estimatedValue = useMemo(() => basketType?.basket_items.reduce((total, item) => total + Number(item.reference_unit_value) * item.required_quantity, 0) ?? 0, [basketType]);
  const limitingItems = useMemo(() => availability?.items.filter((item) => availability.limiting_item_ids.includes(item.item_id)) ?? [], [availability]);

  async function handleSaveBasket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!basketTypeId || !basketForm.name.trim()) return;
    setIsSavingBasket(true);
    setError("");
    setSuccessMessage("");
    try {
      await api.put(`/basket-types/${basketTypeId}`, { name: basketForm.name.trim(), is_active: basketForm.is_active, notes: basketForm.notes.trim() || null });
      await loadData(basketTypeId);
      setSuccessMessage("Dados da cesta atualizados com auditoria registrada.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Não foi possível salvar a cesta."));
    } finally {
      setIsSavingBasket(false);
    }
  }

  async function handleAddItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!basketTypeId || !recipeForm.item_id) {
      setRecipeError("Selecione um produto para adicionar.");
      return;
    }
    setIsAddingItem(true);
    setRecipeError("");
    try {
      const payload: BasketTypeItemCreatePayload = { item_id: Number(recipeForm.item_id), required_quantity: Number(recipeForm.required_quantity) };
      await api.post(`/basket-types/${basketTypeId}/items`, payload);
      setRecipeForm({ item_id: "", required_quantity: 1 });
      await loadData(basketTypeId);
      setSuccessMessage("Produto adicionado à composição.");
    } catch (requestError) {
      setRecipeError(getApiErrorMessage(requestError, "Não foi possível adicionar o produto."));
    } finally {
      setIsAddingItem(false);
    }
  }

  async function handleUpdateItem(itemId: number) {
    if (!basketTypeId) return;
    setBusyItemId(itemId);
    setRecipeError("");
    try {
      await api.put(`/basket-types/${basketTypeId}/items/${itemId}`, { required_quantity: Number(quantityDrafts[itemId] ?? 0) });
      await loadData(basketTypeId);
      setSuccessMessage("Quantidade atualizada.");
    } catch (requestError) {
      setRecipeError(getApiErrorMessage(requestError, "Não foi possível atualizar a quantidade."));
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleDeleteItem(itemId: number) {
    if (!basketTypeId || !window.confirm("Remover este produto da composição?")) return;
    setBusyItemId(itemId);
    setRecipeError("");
    try {
      await api.delete(`/basket-types/${basketTypeId}/items/${itemId}`);
      await loadData(basketTypeId);
      setSuccessMessage("Produto removido da composição.");
    } catch (requestError) {
      setRecipeError(getApiErrorMessage(requestError, "Não foi possível remover o produto."));
    } finally {
      setBusyItemId(null);
    }
  }

  if (isLoading) return <div className={styles.loadingState}>Carregando composição da cesta...</div>;
  if (error && !basketType) return <div className={styles.errorState}><CircleAlert aria-hidden="true" /><strong>Não foi possível abrir a cesta</strong><p>{error}</p><Link to="/basket-types">Voltar para tipos de cesta</Link></div>;
  if (!basketType || !availability) return null;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Link to="/basket-types" className={styles.backLink}><ArrowLeft aria-hidden="true" />Tipos de cesta</Link>
        <div className={styles.detailTitle}><span className={styles.headingIcon}><ShoppingBasket aria-hidden="true" /></span><div><h1>{basketType.name}</h1><p>Edite o modelo e mantenha sua composição operacional.</p></div><span className={basketType.is_active ? styles.statusActive : styles.statusInactive}>{basketType.is_active ? "Ativa" : "Inativa"}</span></div>
      </header>

      {error ? <div className={styles.feedbackError} role="alert">{error}</div> : null}
      {recipeError ? <div className={styles.feedbackError} role="alert">{recipeError}</div> : null}
      {successMessage ? <div className={styles.feedbackSuccess} role="status">{successMessage}</div> : null}

      <section className={styles.summaryStrip}>
        <div><span>Produtos</span><strong>{basketType.basket_items.length}</strong></div>
        <div><span>Valor estimado</span><strong>{formatCurrency(estimatedValue)}</strong></div>
        <div><span>Capacidade atual</span><strong>{availability.possible_baskets} cestas</strong></div>
        <div><span>Itens limitantes</span><strong>{limitingItems.length}</strong></div>
      </section>

      <section className={styles.editorGrid}>
        <form className={styles.formCard} onSubmit={handleSaveBasket}>
          <div className={styles.cardHeading}><div><h2>Dados da cesta</h2><p>Nome, descrição e disponibilidade operacional.</p></div></div>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Nome <b>*</b></span><input value={basketForm.name} onChange={(event) => setBasketForm((current) => ({ ...current, name: event.target.value }))} maxLength={100} required /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição operacional</span><textarea value={basketForm.notes} onChange={(event) => setBasketForm((current) => ({ ...current, notes: event.target.value }))} rows={3} /></label>
            <label className={`${styles.switchField} ${styles.fieldWide}`}><span><strong>Disponível para operação</strong><small>Permite novos agendamentos com este modelo.</small></span><input type="checkbox" checked={basketForm.is_active} onChange={(event) => setBasketForm((current) => ({ ...current, is_active: event.target.checked }))} /><i aria-hidden="true" /></label>
          </div>
          <div className={styles.inlineActions}><button type="submit" disabled={isSavingBasket}><Save aria-hidden="true" />{isSavingBasket ? "Salvando..." : "Salvar dados"}</button></div>
        </form>

        <form className={styles.formCard} onSubmit={handleAddItem}>
          <div className={styles.cardHeading}><span className={styles.secondaryHeadingIcon}><PackagePlus aria-hidden="true" /></span><div><h2>Adicionar produto</h2><p>Inclua um produto ativo e sua quantidade obrigatória.</p></div></div>
          <div className={styles.formGrid}>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Produto <b>*</b></span><select value={recipeForm.item_id} onChange={(event) => setRecipeForm((current) => ({ ...current, item_id: event.target.value }))} required><option value="">Selecione um produto</option>{availableItems.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatUnit(item.unit_measure)}</option>)}</select></label>
            <label className={styles.field}><span>Quantidade <b>*</b></span><input type="number" min="1" value={recipeForm.required_quantity} onChange={(event) => setRecipeForm((current) => ({ ...current, required_quantity: Number(event.target.value) }))} required /></label>
          </div>
          {availableItems.length === 0 ? <p className={styles.inlineNotice}>Todos os produtos ativos já fazem parte desta composição.</p> : null}
          <div className={styles.inlineActions}><button type="submit" disabled={isAddingItem || availableItems.length === 0}><PackagePlus aria-hidden="true" />{isAddingItem ? "Adicionando..." : "Adicionar à composição"}</button></div>
        </form>
      </section>

      <section className={styles.recipeCard}>
        <div className={styles.cardHeading}><div><h2>Composição da cesta</h2><p>Valores estimados usam o preço de referência cadastrado em cada produto.</p></div></div>
        {basketType.basket_items.length === 0 ? <div className={styles.recipeEmpty}><ShoppingBasket aria-hidden="true" /><strong>Nenhum produto na composição</strong><p>Use o formulário acima para montar esta cesta.</p></div> : (
          <div className={styles.recipeList}>{basketType.basket_items.map((item) => <article className={styles.recipeRow} key={item.item_id}>
            <ProductImage name={item.item_name} src={item.image_path} size="card" />
            <div className={styles.recipeIdentity}><strong>{item.item_name}</strong><span>{item.category_name} · {item.tracks_expiration ? "Perecível" : "Não perecível"}</span><small>{formatCurrency(Number(item.reference_unit_value))} por {formatUnit(item.unit_measure)}</small></div>
            <label className={styles.quantityField}><span>Quantidade</span><input type="number" min="1" value={quantityDrafts[item.item_id] ?? item.required_quantity} onChange={(event) => setQuantityDrafts((current) => ({ ...current, [item.item_id]: event.target.value }))} /></label>
            <strong className={styles.lineValue}>{formatCurrency(Number(item.reference_unit_value) * Number(quantityDrafts[item.item_id] ?? item.required_quantity))}</strong>
            <div className={styles.recipeActions}><button type="button" onClick={() => void handleUpdateItem(item.item_id)} disabled={busyItemId === item.item_id} aria-label={`Salvar quantidade de ${item.item_name}`}><Check aria-hidden="true" /></button><button type="button" onClick={() => void handleDeleteItem(item.item_id)} disabled={busyItemId === item.item_id} aria-label={`Remover ${item.item_name}`}><Trash2 aria-hidden="true" /></button></div>
          </article>)}</div>
        )}
      </section>

      <section className={styles.availabilityCard}>
        <div className={styles.cardHeading}><div><h2>Capacidade de montagem</h2><p>Saldo utilizável por produto e gargalos para a próxima cesta.</p></div></div>
        <div className={styles.availabilityGrid}>{availability.items.map((item) => {
          const isLimiting = availability.limiting_item_ids.includes(item.item_id);
          return <article key={item.item_id} className={isLimiting ? styles.availabilityLimiting : ""}><div><strong>{item.item_name}</strong><span>Disponível: {item.available_quantity} {formatUnit(item.unit_measure)}</span></div><b>{item.possible_from_item} cestas</b>{isLimiting ? <small>Faltam {item.missing_for_next_basket} para a próxima</small> : <small>Capacidade regular</small>}</article>;
        })}</div>
      </section>
    </div>
  );
}
