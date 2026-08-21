import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  CalendarClock,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  CirclePlus,
  History,
  Package,
  PackagePlus,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { ProductImage } from "../components/ProductImage";
import type {
  StockMovementResponse,
  StockOverviewAttention,
  StockOverviewItemResponse,
  StockOverviewResponse,
  StockOverviewSummaryResponse,
} from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateOnly } from "../utils/format";
import {
  buildListSearchParams,
  getQueryOffset,
  getQueryText,
} from "../utils/list-query";
import styles from "./ItemsPage.module.css";

const PAGE_SIZE = 25;

const EMPTY_SUMMARY: StockOverviewSummaryResponse = {
  total_items: 0,
  active_items: 0,
  low_stock_items: 0,
  expiring_soon_batches: 0,
  expired_batches: 0,
  missing_expiration_batches: 0,
  restricted_batches: 0,
};

const attentionOptions: Array<{ value: StockOverviewAttention | ""; label: string }> = [
  { value: "", label: "Todas as situações" },
  { value: "estoque_baixo", label: "Estoque baixo" },
  { value: "vencendo_em_breve", label: "Vencendo em até 15 dias" },
  { value: "vencido", label: "Lote vencido" },
  { value: "validade_ausente", label: "Validade obrigatória ausente" },
  { value: "restrito", label: "Lote restrito" },
];

const movementLabels: Record<string, string> = {
  ajuste_positivo: "Ajuste positivo",
  ajuste_negativo: "Ajuste negativo",
  perda_validade: "Perda por validade",
  saida_entrega: "Saída para entrega",
  saida_manual: "Saída manual",
};

function getSelectedId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, "ellipsis", totalPages] as const;
  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages] as const;
  }
  return [1, "ellipsis", currentPage, "ellipsis", totalPages] as const;
}

function getItemStatus(item: StockOverviewItemResponse) {
  if (!item.is_active) {
    return { label: "Inativo", className: styles.statusInactive };
  }
  if (item.expired_batches > 0) {
    return { label: "Lote vencido", className: styles.statusDanger };
  }
  if (item.missing_expiration_batches > 0) {
    return { label: "Validade ausente", className: styles.statusDanger };
  }
  if (item.restricted_batches > 0) {
    return { label: "Lote restrito", className: styles.statusInfo };
  }
  if (item.is_below_minimum) {
    return { label: "Estoque baixo", className: styles.statusWarning };
  }
  if (item.expiring_soon_batches > 0) {
    return { label: "Vencendo em breve", className: styles.statusWarning };
  }
  return { label: "Disponível", className: styles.statusSuccess };
}

function formatQuantity(value: number, unit: string) {
  return `${new Intl.NumberFormat("pt-BR").format(value)} ${unit}`;
}

function getMovementSignal(movementType: string) {
  return movementType === "ajuste_positivo" ? "positive" : "negative";
}

export function ItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSearch = getQueryText(searchParams, "q");
  const activeStatus = getQueryText(searchParams, "active");
  const activeAttention = getQueryText(searchParams, "attention") as StockOverviewAttention | "";
  const activeOffset = getQueryOffset(searchParams);
  const selectedFromUrl = getSelectedId(getQueryText(searchParams, "selected"));
  const [overview, setOverview] = useState<StockOverviewResponse | null>(null);
  const [movements, setMovements] = useState<StockMovementResponse[]>([]);
  const [movementItemId, setMovementItemId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(
    Boolean(activeStatus || activeAttention),
  );
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    void api
      .get<StockOverviewResponse>("/stock-overview", {
        params: {
          q: activeSearch || undefined,
          is_active: activeStatus === "" ? undefined : activeStatus === "true",
          attention: activeAttention || undefined,
          due_soon_days: 15,
          limit: PAGE_SIZE,
          offset: activeOffset,
        },
      })
      .then((response) => {
        if (isCurrent) {
          setOverview(response.data);
          setError("");
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(
            getApiErrorMessage(requestError, "Não foi possível carregar o estoque."),
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeAttention, activeOffset, activeSearch, activeStatus]);

  const items = overview?.items ?? [];
  const summary = overview?.summary ?? EMPTY_SUMMARY;
  const total = overview?.total ?? 0;
  const selectedItemId = selectedFromUrl ?? items[0]?.item_id ?? null;
  const selectedItem =
    items.find((item) => item.item_id === selectedItemId) ?? items[0] ?? null;

  useEffect(() => {
    if (!selectedItem?.item_id) {
      return;
    }

    let isCurrent = true;

    void api
      .get<StockMovementResponse[]>("/stock-movements", {
        params: { item_id: selectedItem.item_id, limit: 3, offset: 0 },
      })
      .then((response) => {
        if (isCurrent) {
          setMovements(response.data);
          setMovementItemId(selectedItem.item_id);
          setHistoryError("");
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setMovements([]);
          setMovementItemId(selectedItem.item_id);
          setHistoryError(
            getApiErrorMessage(requestError, "Histórico indisponível."),
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedItem?.item_id]);

  const currentPage = Math.floor(activeOffset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resultStart = total === 0 ? 0 : activeOffset + 1;
  const resultEnd = Math.min(activeOffset + items.length, total);
  const filterCount = Number(Boolean(activeStatus)) + Number(Boolean(activeAttention));
  const visibleMovements = movementItemId === selectedItem?.item_id ? movements : [];

  function updateQuery(values: Record<string, string | number | null>) {
    setSearchParams((currentParams) => buildListSearchParams(currentParams, values));
  }

  function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsLoading(true);
    updateQuery({
      q: String(formData.get("stock_search") ?? "").trim(),
      active: String(formData.get("stock_status") ?? ""),
      attention: String(formData.get("stock_attention") ?? ""),
      offset: null,
      selected: null,
    });
  }

  function handleClearFilters() {
    setIsFiltersOpen(false);
    setIsLoading(true);
    updateQuery({ q: null, active: null, attention: null, offset: null, selected: null });
  }

  function handleMetricFilter(attention: StockOverviewAttention) {
    setIsLoading(true);
    updateQuery({
      attention: activeAttention === attention ? null : attention,
      offset: null,
      selected: null,
    });
  }

  function handlePageChange(page: number) {
    setIsLoading(true);
    updateQuery({ offset: (page - 1) * PAGE_SIZE || null, selected: null });
  }

  function handleSelectItem(itemId: number) {
    updateQuery({ selected: itemId });
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Estoque</h1>
          <p>
            Acompanhe alimentos, produtos de higiene e demais itens doados, com
            quantidades e prazos de validade.
          </p>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Indicadores do estoque">
        <button
          type="button"
          className={`${styles.metricCard} ${styles.metricLow}${activeAttention === "estoque_baixo" ? ` ${styles.metricActive}` : ""}`}
          onClick={() => handleMetricFilter("estoque_baixo")}
          aria-pressed={activeAttention === "estoque_baixo"}
        >
          <span className={styles.metricIcon}><AlertTriangle aria-hidden="true" /></span>
          <span className={styles.metricCopy}>
            <span>Estoque baixo</span>
            <strong>{summary.low_stock_items} <small>itens</small></strong>
            <span className={styles.metricLink}>Ver itens</span>
          </span>
        </button>

        <button
          type="button"
          className={`${styles.metricCard} ${styles.metricSoon}${activeAttention === "vencendo_em_breve" ? ` ${styles.metricActive}` : ""}`}
          onClick={() => handleMetricFilter("vencendo_em_breve")}
          aria-pressed={activeAttention === "vencendo_em_breve"}
        >
          <span className={styles.metricIcon}><CalendarClock aria-hidden="true" /></span>
          <span className={styles.metricCopy}>
            <span>Vencendo em até 15 dias</span>
            <strong>{summary.expiring_soon_batches} <small>lotes</small></strong>
            <span className={styles.metricLink}>Ver lotes</span>
          </span>
        </button>

        <button
          type="button"
          className={`${styles.metricCard} ${styles.metricExpired}${activeAttention === "vencido" ? ` ${styles.metricActive}` : ""}`}
          onClick={() => handleMetricFilter("vencido")}
          aria-pressed={activeAttention === "vencido"}
        >
          <span className={styles.metricIcon}><CalendarX2 aria-hidden="true" /></span>
          <span className={styles.metricCopy}>
            <span>Lotes vencidos</span>
            <strong>{summary.expired_batches} <small>lotes</small></strong>
            <span className={styles.metricLink}>Ver lotes</span>
          </span>
        </button>
      </section>

      <form
        key={`stock-search-${activeSearch}-${activeStatus}-${activeAttention}`}
        className={styles.toolbar}
        onSubmit={handleApplyFilters}
        role="search"
      >
        <label className={styles.searchField}>
          <span className={styles.srOnly}>Buscar produtos no estoque</span>
          <Search aria-hidden="true" />
          <input
            type="search"
            name="stock_search"
            placeholder="Buscar produto, categoria ou unidade…"
            defaultValue={activeSearch}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <button
          className={`${styles.filterButton}${filterCount ? ` ${styles.filterButtonActive}` : ""}`}
          type="button"
          aria-expanded={isFiltersOpen}
          aria-controls="stock-filters"
          onClick={() => setIsFiltersOpen((current) => !current)}
        >
          <SlidersHorizontal aria-hidden="true" />
          Filtros
          {filterCount ? <span className={styles.filterCount}>{filterCount}</span> : null}
        </button>

        <Link className={styles.secondaryAction} to="/items/new">
          <PackagePlus aria-hidden="true" />
          Novo produto
        </Link>

        <Link className={styles.primaryAction} to="/stock-batches/new">
          <Plus aria-hidden="true" />
          Registrar entrada
        </Link>

        {isFiltersOpen ? (
          <div id="stock-filters" className={styles.filterPanel}>
            <label>
              <span>Situação do produto</span>
              <select name="stock_status" defaultValue={activeStatus}>
                <option value="">Ativos e inativos</option>
                <option value="true">Somente ativos</option>
                <option value="false">Somente inativos</option>
              </select>
            </label>
            <label>
              <span>Atenção operacional</span>
              <select name="stock_attention" defaultValue={activeAttention}>
                {attentionOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.filterActions}>
              <button type="button" onClick={handleClearFilters}>Limpar</button>
              <button type="submit">Aplicar filtros</button>
            </div>
          </div>
        ) : null}
      </form>

      <div className={styles.workspace}>
        <section className={styles.listPanel} aria-label="Produtos em estoque">
          {isLoading ? (
            <div className={styles.loadingList} aria-live="polite">
              <span>Carregando estoque…</span>
              {Array.from({ length: 7 }, (_, index) => (
                <span className={styles.skeletonRow} key={index} aria-hidden="true" />
              ))}
            </div>
          ) : error ? (
            <div className={styles.stateMessage} role="alert">
              <strong>Não foi possível abrir o estoque</strong>
              <span>{error}</span>
              <button type="button" onClick={() => window.location.reload()}>Tentar novamente</button>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.stateMessage}>
              <Package aria-hidden="true" />
              <strong>Nenhum produto encontrado</strong>
              <span>Ajuste os filtros ou cadastre um novo produto.</span>
              {filterCount || activeSearch ? (
                <button type="button" onClick={handleClearFilters}>Limpar filtros</button>
              ) : null}
            </div>
          ) : (
            <>
              <div className={styles.desktopTable}>
                <table>
                  <caption className={styles.srOnly}>Produtos e saldos disponíveis</caption>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Categoria</th>
                      <th>Quantidade</th>
                      <th>Unidade</th>
                      <th>Próxima validade</th>
                      <th>Status</th>
                      <th><span className={styles.srOnly}>Selecionar</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const status = getItemStatus(item);
                      const isSelected = selectedItem?.item_id === item.item_id;
                      return (
                        <tr key={item.item_id} className={isSelected ? styles.selectedRow : undefined}>
                          <td>
                            <button
                              type="button"
                              className={styles.productButton}
                              onClick={() => handleSelectItem(item.item_id)}
                            >
                              <ProductImage name={item.item_name} src={item.image_path} size="compact" />
                              <span>{item.item_name}</span>
                            </button>
                          </td>
                          <td>{item.category_name}</td>
                          <td><strong>{new Intl.NumberFormat("pt-BR").format(item.total_quantity)}</strong></td>
                          <td>{item.unit_measure}</td>
                          <td>{item.next_expiration_date ? formatDateOnly(item.next_expiration_date) : "—"}</td>
                          <td><span className={`${styles.statusBadge} ${status.className}`}>{status.label}</span></td>
                          <td>
                            <button
                              type="button"
                              className={styles.selectButton}
                              onClick={() => handleSelectItem(item.item_id)}
                              aria-label={`Selecionar ${item.item_name}`}
                            >
                              <ChevronRight aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={styles.mobileList}>
                {items.map((item) => {
                  const status = getItemStatus(item);
                  return (
                    <article className={styles.productCard} key={item.item_id}>
                      <div className={styles.productCardHeader}>
                        <ProductImage name={item.item_name} src={item.image_path} size="card" />
                        <div>
                          <h2>{item.item_name}</h2>
                          <p>{item.category_name}</p>
                        </div>
                        <span className={`${styles.statusBadge} ${status.className}`}>{status.label}</span>
                      </div>
                      <div className={styles.productCardBalance}>
                        <span>Quantidade disponível</span>
                        <strong>{formatQuantity(item.total_quantity, item.unit_measure)}</strong>
                      </div>
                      <dl className={styles.productCardMeta}>
                        <div>
                          <dt>Estoque mínimo</dt>
                          <dd>{formatQuantity(item.minimum_stock_alert, item.unit_measure)}</dd>
                        </div>
                        <div>
                          <dt>Próxima validade</dt>
                          <dd>{item.next_expiration_date ? formatDateOnly(item.next_expiration_date) : "Não aplicável"}</dd>
                        </div>
                      </dl>
                      <div className={styles.productCardActions}>
                        <Link to={`/items/${item.item_id}`}>Ver detalhes <ArrowRight aria-hidden="true" /></Link>
                        {item.is_active ? (
                          <Link to={`/stock-batches/new?itemId=${item.item_id}`}>Registrar entrada</Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className={styles.pagination}>
                <span>Mostrando {resultStart} a {resultEnd} de {total} produtos</span>
                <nav aria-label="Paginação do estoque">
                  <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} aria-label="Página anterior">
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  {getPaginationItems(currentPage, totalPages).map((page, index) =>
                    page === "ellipsis" ? (
                      <span className={styles.ellipsis} key={`ellipsis-${index}`}>…</span>
                    ) : (
                      <button key={page} type="button" onClick={() => handlePageChange(page)} aria-current={page === currentPage ? "page" : undefined}>
                        {page}
                      </button>
                    ),
                  )}
                  <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Próxima página">
                    <ChevronRight aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </>
          )}
        </section>

        <aside className={styles.summaryPanel} aria-label="Item selecionado">
          <h2>Item selecionado</h2>
          {!selectedItem ? (
            <p className={styles.summaryEmpty}>Selecione um produto para ver seu resumo.</p>
          ) : (
            <>
              <div className={styles.summaryIdentity}>
                <ProductImage name={selectedItem.item_name} src={selectedItem.image_path} size="card" eager />
                <div>
                  <strong>{selectedItem.item_name}</strong>
                  <span>{selectedItem.category_name}</span>
                  {selectedItem.image_attribution ? (
                    <small className={styles.imageAttribution}>{selectedItem.image_attribution}</small>
                  ) : null}
                  <span className={`${styles.statusBadge} ${getItemStatus(selectedItem).className}`}>
                    {getItemStatus(selectedItem).label}
                  </span>
                </div>
              </div>

              <dl className={styles.summaryDetails}>
                <div className={styles.summaryBalance}>
                  <dt>Quantidade disponível</dt>
                  <dd>{formatQuantity(selectedItem.total_quantity, selectedItem.unit_measure)}</dd>
                </div>
                <div><dt>Unidade</dt><dd>{selectedItem.unit_measure}</dd></div>
                <div><dt>Próxima validade</dt><dd>{selectedItem.next_expiration_date ? formatDateOnly(selectedItem.next_expiration_date) : "Não aplicável"}</dd></div>
                <div><dt>Estoque mínimo</dt><dd>{formatQuantity(selectedItem.minimum_stock_alert, selectedItem.unit_measure)}</dd></div>
                <div><dt>Lotes cadastrados</dt><dd>{selectedItem.total_batches}</dd></div>
                <div><dt>Código de barras</dt><dd>{selectedItem.barcode || "Não informado"}</dd></div>
              </dl>

              {(selectedItem.expired_batches > 0 || selectedItem.missing_expiration_batches > 0 || selectedItem.restricted_batches > 0) ? (
                <div className={styles.attentionBox}>
                  <strong><AlertTriangle aria-hidden="true" /> Atenção operacional</strong>
                  {selectedItem.expired_batches > 0 ? <span>{selectedItem.expired_batches} lote(s) vencido(s)</span> : null}
                  {selectedItem.missing_expiration_batches > 0 ? <span>{selectedItem.missing_expiration_batches} lote(s) sem validade obrigatória</span> : null}
                  {selectedItem.restricted_batches > 0 ? <span>{selectedItem.restricted_batches} lote(s) restrito(s)</span> : null}
                </div>
              ) : null}

              <section className={styles.quickActions} aria-labelledby="stock-quick-actions">
                <h3 id="stock-quick-actions">Movimentações rápidas</h3>
                {selectedItem.is_active ? (
                  <Link to={`/stock-batches/new?itemId=${selectedItem.item_id}`}>
                    <CirclePlus aria-hidden="true" /> Registrar entrada
                  </Link>
                ) : null}
                {selectedItem.is_active ? (
                  <Link to={`/stock-movements/new?itemId=${selectedItem.item_id}`}>
                    <CircleMinus aria-hidden="true" /> Registrar saída ou ajuste
                  </Link>
                ) : null}
                <Link to={`/items/${selectedItem.item_id}`}>
                  <ArrowDownToLine aria-hidden="true" /> Ver lotes e detalhes
                </Link>
              </section>

              <section className={styles.history} aria-labelledby="stock-history">
                <h3 id="stock-history"><History aria-hidden="true" /> Histórico recente</h3>
                {historyError && movementItemId === selectedItem.item_id ? <p className={styles.historyEmpty}>{historyError}</p> : visibleMovements.length === 0 ? (
                  <p className={styles.historyEmpty}>Nenhuma movimentação registrada para este item.</p>
                ) : (
                  <ol>
                    {visibleMovements.map((movement) => {
                      const signal = getMovementSignal(movement.movement_type);
                      return (
                        <li key={movement.id}>
                          <span className={signal === "positive" ? styles.historyPositive : styles.historyNegative}>
                            {signal === "positive" ? <CirclePlus aria-hidden="true" /> : <CircleMinus aria-hidden="true" />}
                          </span>
                          <span><strong>{movementLabels[movement.movement_type] ?? movement.movement_type}</strong><small>Lote #{movement.batch_id}</small></span>
                          <b>{signal === "positive" ? "+" : "−"}{formatQuantity(movement.quantity, selectedItem.unit_measure)}</b>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <Link to={`/items/${selectedItem.item_id}`}>Ver histórico completo</Link>
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
