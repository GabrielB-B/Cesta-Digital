import { useEffect, useState } from "react";
import { Archive, Check, ChevronLeft, ChevronRight, CircleAlert, Pencil, Plus, Search, ShoppingBasket } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { ProductImage } from "../components/ProductImage";
import type { BasketAvailabilityResponse, BasketTypeDetailResponse, BasketTypeOverviewItemResponse } from "../types/basket";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateTime } from "../utils/format";
import { buildListSearchParams, getQueryOffset, getQueryText } from "../utils/list-query";
import styles from "./BasketTypesPage.module.css";

const PAGE_SIZE = 6;

function getPositiveInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

function formatUnit(unit: string) {
  const labels: Record<string, string> = { unidade: "un.", pacote: "pct.", kg: "kg", litro: "L", caixa: "cx.", frasco: "fr." };
  return labels[unit] ?? unit;
}

function getCardTone(index: number) {
  return [styles.cardPink, styles.cardPurple, styles.cardOrange][index % 3];
}

export function BasketTypesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSearch = getQueryText(searchParams, "q");
  const activeStatus = getQueryText(searchParams, "active");
  const activeOffset = getQueryOffset(searchParams);
  const selectedFromUrl = getPositiveInteger(getQueryText(searchParams, "selected"));
  const [searchDraft, setSearchDraft] = useState(activeSearch);
  const [basketTypes, setBasketTypes] = useState<BasketTypeOverviewItemResponse[]>([]);
  const [basketType, setBasketType] = useState<BasketTypeDetailResponse | null>(null);
  const [availability, setAvailability] = useState<BasketAvailabilityResponse | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;
    void api.get<BasketTypeOverviewItemResponse[]>("/basket-types/overview", {
      params: { q: activeSearch || undefined, is_active: activeStatus === "" ? undefined : activeStatus === "true", limit: PAGE_SIZE, offset: activeOffset },
    }).then((response) => {
      if (!isCurrent) return;
      setBasketTypes(response.data);
      setTotal(Number(response.headers["x-total-count"] ?? response.data.length));
      setIsDetailLoading(response.data.length > 0);
      setDetailError("");
      setError("");
    }).catch((requestError) => {
      if (isCurrent) setError(getApiErrorMessage(requestError, "Não foi possível carregar os tipos de cesta."));
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });
    return () => { isCurrent = false; };
  }, [activeOffset, activeSearch, activeStatus]);

  const selectedId = basketTypes.some((entry) => entry.id === selectedFromUrl) ? selectedFromUrl : basketTypes[0]?.id ?? null;
  const selectedOverview = basketTypes.find((entry) => entry.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    let isCurrent = true;
    void Promise.all([
      api.get<BasketTypeDetailResponse>(`/basket-types/${selectedId}`),
      api.get<BasketAvailabilityResponse>(`/basket-types/${selectedId}/availability`),
    ]).then(([detailResponse, availabilityResponse]) => {
      if (!isCurrent) return;
      setBasketType(detailResponse.data);
      setAvailability(availabilityResponse.data);
    }).catch((requestError) => {
      if (!isCurrent) return;
      setBasketType(null);
      setAvailability(null);
      setDetailError(getApiErrorMessage(requestError, "Não foi possível carregar a composição selecionada."));
    }).finally(() => {
      if (isCurrent) setIsDetailLoading(false);
    });
    return () => { isCurrent = false; };
  }, [selectedId]);

  const currentPage = Math.floor(activeOffset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resultStart = total === 0 ? 0 : activeOffset + 1;
  const resultEnd = Math.min(activeOffset + basketTypes.length, total);

  function updateQuery(values: Record<string, string | number | null>) {
    setSearchParams((currentParams) => buildListSearchParams(currentParams, values));
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ q: searchDraft.trim(), offset: null, selected: null });
  }

  async function handleToggleStatus() {
    if (!basketType) return;
    const nextStatus = !basketType.is_active;
    if (!nextStatus && !window.confirm("Desativar este tipo de cesta para novos agendamentos?")) return;
    setIsUpdatingStatus(true);
    setDetailError("");
    setSuccessMessage("");
    try {
      const response = await api.put<BasketTypeDetailResponse>(`/basket-types/${basketType.id}`, {
        name: basketType.name,
        is_active: nextStatus,
        notes: basketType.notes,
      });
      setBasketType(response.data);
      setBasketTypes((current) => current.map((entry) => entry.id === basketType.id ? { ...entry, is_active: nextStatus } : entry));
      setSuccessMessage(nextStatus ? "Cesta reativada para a operação." : "Cesta desativada para novos agendamentos.");
    } catch (requestError) {
      setDetailError(getApiErrorMessage(requestError, "Não foi possível alterar o status da cesta."));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><h1>Tipos de cesta</h1><p>Defina e gerencie as composições disponíveis para entrega.</p></div>
        <Link to="/basket-types/new" className={styles.primaryAction}><Plus aria-hidden="true" />Nova cesta</Link>
      </header>

      <form className={styles.toolbar} onSubmit={handleSearch} role="search">
        <label className={styles.searchField}>
          <span className={styles.srOnly}>Buscar tipos de cesta</span><Search aria-hidden="true" />
          <input name="basket_types_search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Buscar cestas..." autoComplete="off" />
        </label>
        <label className={styles.statusFilter}>
          <span className={styles.srOnly}>Filtrar tipos de cesta por status</span>
          <select name="basket_types_status" value={activeStatus} onChange={(event) => { setIsLoading(true); updateQuery({ active: event.target.value || null, offset: null, selected: null }); }}>
            <option value="">Todas</option><option value="true">Ativas</option><option value="false">Inativas</option>
          </select>
        </label>
        <button type="submit" className={styles.searchButton}>Buscar</button>
      </form>

      {error ? <div className={styles.feedbackError} role="alert">{error}</div> : null}
      {successMessage ? <div className={styles.feedbackSuccess} role="status">{successMessage}</div> : null}

      {isLoading ? (
        <section className={styles.cardGrid} aria-label="Carregando tipos de cesta">{Array.from({ length: 3 }).map((_, index) => <div className={styles.cardSkeleton} key={index} />)}</section>
      ) : basketTypes.length === 0 ? (
        <section className={styles.emptyState}><ShoppingBasket aria-hidden="true" /><strong>Nenhuma cesta encontrada</strong><p>Ajuste a busca ou cadastre uma nova composição.</p></section>
      ) : (
        <>
          <section className={styles.cardGrid} aria-label="Tipos de cesta cadastrados">
            {basketTypes.map((entry, index) => {
              const isSelected = entry.id === selectedId;
              return (
                <button type="button" key={entry.id} className={`${styles.basketCard} ${getCardTone(index)} ${isSelected ? styles.basketCardSelected : ""}`} aria-pressed={isSelected} onClick={() => { setSuccessMessage(""); setIsDetailLoading(true); setDetailError(""); updateQuery({ selected: entry.id }); }}>
                  <span className={styles.basketIcon}><ShoppingBasket aria-hidden="true" /></span>
                  <span className={styles.cardContent}>
                    <strong>{entry.name}</strong>
                    <span className={styles.cardMetrics}>
                      <span>{entry.item_count} {entry.item_count === 1 ? "produto" : "produtos"}</span>
                      <span><b>{formatCurrency(entry.estimated_value)}</b><small>valor estimado</small></span>
                    </span>
                    <span className={entry.is_active ? styles.statusActive : styles.statusInactive}>{entry.is_active ? "Ativa" : "Inativa"}</span>
                  </span>
                  {isSelected ? <span className={styles.selectedCheck}><Check aria-hidden="true" /></span> : null}
                </button>
              );
            })}
          </section>

          {totalPages > 1 ? (
            <div className={styles.cardPagination}>
              <span>Mostrando {resultStart} a {resultEnd} de {total} cestas</span>
              <nav aria-label="Paginação dos tipos de cesta">
                <button type="button" onClick={() => { setIsLoading(true); updateQuery({ offset: (currentPage - 2) * PAGE_SIZE || null, selected: null }); }} disabled={currentPage <= 1} aria-label="Página anterior"><ChevronLeft aria-hidden="true" /></button>
                <span>Página {currentPage} de {totalPages}</span>
                <button type="button" onClick={() => { setIsLoading(true); updateQuery({ offset: currentPage * PAGE_SIZE, selected: null }); }} disabled={currentPage >= totalPages} aria-label="Próxima página"><ChevronRight aria-hidden="true" /></button>
              </nav>
            </div>
          ) : null}

          <section className={styles.workspace}>
            <article className={styles.compositionPanel}>
              <div className={styles.panelHeading}>
                <div><span>Composição selecionada</span><h2>{selectedOverview?.name ?? "Tipo de cesta"}</h2></div>
                {selectedId ? <Link to={`/basket-types/${selectedId}`} className={styles.compactEdit}><Pencil aria-hidden="true" />Editar composição</Link> : null}
              </div>
              {isDetailLoading ? <div className={styles.detailLoading}>Carregando composição...</div> : detailError ? (
                <div className={styles.detailError} role="alert"><CircleAlert aria-hidden="true" />{detailError}</div>
              ) : !basketType || basketType.basket_items.length === 0 ? (
                <div className={styles.compositionEmpty}><ShoppingBasket aria-hidden="true" /><strong>Composição ainda vazia</strong><p>Edite a cesta para adicionar produtos e quantidades.</p></div>
              ) : (
                <>
                  <div className={styles.desktopTable}>
                    <table><caption>Produtos da cesta {basketType.name}</caption><thead><tr><th>Produto</th><th>Quantidade</th><th>Unidade</th><th>Categoria</th><th>Tipo</th></tr></thead>
                      <tbody>{basketType.basket_items.map((item) => <tr key={item.item_id}>
                        <td><span className={styles.productIdentity}><ProductImage name={item.item_name} src={item.image_path} size="compact" /><strong>{item.item_name}</strong></span></td>
                        <td>{item.required_quantity}</td><td>{formatUnit(item.unit_measure)}</td><td>{item.category_name}</td><td>{item.tracks_expiration ? "Perecível" : "Não perecível"}</td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                  <div className={styles.mobileComposition} aria-label="Composição em cartões">{basketType.basket_items.map((item) => <article key={item.item_id} className={styles.productCard}>
                    <ProductImage name={item.item_name} src={item.image_path} size="card" /><div><strong>{item.item_name}</strong><span>{item.category_name} · {item.tracks_expiration ? "Perecível" : "Não perecível"}</span></div><b>{item.required_quantity} {formatUnit(item.unit_measure)}</b>
                  </article>)}</div>
                </>
              )}
            </article>

            <aside className={styles.summaryPanel} aria-label="Resumo da cesta selecionada">
              <h2>Resumo da cesta</h2>
              <div className={styles.summaryValue}><span>Valor estimado total</span><strong>{formatCurrency(selectedOverview?.estimated_value ?? 0)}</strong><small>Baseado no valor de referência dos produtos</small></div>
              <dl className={styles.summaryDetails}>
                <div><dt>Status</dt><dd className={basketType?.is_active ? styles.statusActive : styles.statusInactive}>{basketType?.is_active ? "Ativa" : "Inativa"}</dd></div>
                <div><dt>Produtos na composição</dt><dd>{selectedOverview?.item_count ?? 0}</dd></div>
                <div><dt>Capacidade atual</dt><dd>{availability?.possible_baskets ?? 0} cestas</dd></div>
                <div><dt>Última atualização</dt><dd>{selectedOverview ? formatDateTime(selectedOverview.updated_at) : "—"}</dd></div>
              </dl>
              {selectedOverview?.notes ? <p className={styles.summaryNotes}>{selectedOverview.notes}</p> : null}
              <div className={styles.summaryActions}>
                {selectedId ? <Link to={`/basket-types/${selectedId}`}><Pencil aria-hidden="true" />Editar cesta</Link> : null}
                <button type="button" className={basketType?.is_active ? styles.deactivateAction : styles.activateAction} onClick={() => void handleToggleStatus()} disabled={!basketType || isUpdatingStatus}>
                  {basketType?.is_active ? <Archive aria-hidden="true" /> : <Check aria-hidden="true" />}{isUpdatingStatus ? "Salvando..." : basketType?.is_active ? "Desativar cesta" : "Reativar cesta"}
                </button>
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
