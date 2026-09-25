import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  MapPin,
  PackagePlus,
  Plus,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { ProductImage } from "../components/ProductImage";
import { StockBatchFormPanel } from "../components/StockBatchFormPanel";
import type { ItemDetailResponse, StockBatchResponse } from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateOnly } from "../utils/format";
import { buildListSearchParams, getQueryOffset } from "../utils/list-query";
import { formatStockSourceType, getBatchExpirationStatus } from "../utils/stock";
import styles from "./StockBatchesPage.module.css";

const PAGE_SIZE = 8;

function getStatus(batch: StockBatchResponse) {
  if (batch.status === "quarentena") {
    return { label: "Em quarentena", className: styles.statusWarning };
  }
  if (batch.status === "bloqueado") {
    return { label: "Bloqueado", className: styles.statusDanger };
  }
  return { label: "Disponível", className: styles.statusSuccess };
}

function getExpirationStatus(batch: StockBatchResponse, item?: ItemDetailResponse) {
  const expiration = getBatchExpirationStatus(batch, item?.tracks_expiration ?? true);
  const className =
    expiration.tone === "danger"
      ? styles.expirationDanger
      : expiration.tone === "warning"
        ? styles.expirationWarning
        : styles.expirationNeutral;
  return { ...expiration, className };
}

export function StockBatchesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeOffset = getQueryOffset(searchParams);
  const [batches, setBatches] = useState<StockBatchResponse[]>([]);
  const [items, setItems] = useState<ItemDetailResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    void Promise.all([
      api.get<StockBatchResponse[]>("/stock-batches", {
        params: { limit: PAGE_SIZE, offset: activeOffset },
      }),
      api.get<ItemDetailResponse[]>("/items"),
    ])
      .then(([batchResponse, itemResponse]) => {
        if (!isCurrent) return;
        const headerTotal = Number(batchResponse.headers["x-total-count"]);
        setBatches(batchResponse.data);
        setItems(itemResponse.data);
        setTotal(Number.isFinite(headerTotal) ? headerTotal : batchResponse.data.length);
        setError("");
      })
      .catch((requestError) => {
        if (!isCurrent) return;
        setError(
          getApiErrorMessage(
            requestError,
            "Não foi possível carregar o histórico de entradas.",
          ),
        );
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeOffset, refreshKey]);

  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const activeItems = useMemo(() => items.filter((item) => item.is_active), [items]);
  const currentPage = Math.floor(activeOffset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resultStart = total === 0 ? 0 : activeOffset + 1;
  const resultEnd = Math.min(activeOffset + batches.length, total);

  function goToOffset(offset: number) {
    setIsLoading(true);
    setSearchParams((current) =>
      buildListSearchParams(current, { offset: offset > 0 ? offset : null }),
    );
  }

  function handleCreated() {
    setIsLoading(true);
    if (activeOffset > 0) {
      goToOffset(0);
      return;
    }
    setRefreshKey((current) => current + 1);
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Entradas</h1>
          <p>Registre e acompanhe os recebimentos e lotes adicionados ao estoque.</p>
        </div>
        <Link className={styles.primaryAction} to="/stock-batches/new">
          <Plus aria-hidden="true" />
          Nova entrada
        </Link>
      </header>

      <div className={styles.workspace}>
        <section className={styles.historyPanel} aria-labelledby="entries-history-title">
          <div className={styles.panelHeading}>
            <span className={styles.panelIcon} aria-hidden="true">
              <ArrowDownToLine />
            </span>
            <div>
              <h2 id="entries-history-title">Histórico de entradas</h2>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loadingList} aria-label="Carregando entradas">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          ) : error ? (
            <div className={styles.stateMessage} role="alert">
              <strong>Histórico indisponível</strong>
              <p>{error}</p>
              <button type="button" onClick={() => setRefreshKey((current) => current + 1)}>
                Tentar novamente
              </button>
            </div>
          ) : batches.length === 0 ? (
            <div className={styles.stateMessage}>
              <PackagePlus aria-hidden="true" />
              <strong>Nenhuma entrada registrada</strong>
              <p>O primeiro lote recebido aparecerá aqui.</p>
              <Link to="/stock-batches/new">Registrar primeira entrada</Link>
            </div>
          ) : (
            <>
              <div className={styles.desktopTable}>
                <table aria-label="Histórico de lotes recebidos">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Produto</th>
                      <th>Origem</th>
                      <th>Lote</th>
                      <th>Quantidade</th>
                      <th>Validade</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => {
                      const item = itemById.get(batch.item_id);
                      const status = getStatus(batch);
                      const expiration = getExpirationStatus(batch, item);
                      return (
                        <tr key={batch.id}>
                          <td>{formatDateOnly(batch.entry_date)}</td>
                          <td>
                            <span className={styles.productCell}>
                              <ProductImage
                                name={item?.name ?? `Produto ${batch.item_id}`}
                                src={item?.image_path}
                                size="compact"
                              />
                              <span>
                                <strong>{item?.name ?? `Produto #${batch.item_id}`}</strong>
                                <small>{item?.category_name ?? "Categoria não carregada"}</small>
                              </span>
                            </span>
                          </td>
                          <td>{formatStockSourceType(batch.source_type)}</td>
                          <td className={styles.batchCode}>{batch.batch_code ?? `Lote #${batch.id}`}</td>
                          <td>
                            <strong className={styles.quantity}>
                              {new Intl.NumberFormat("pt-BR").format(batch.entry_quantity)} {item?.unit_measure ?? "un."}
                            </strong>
                          </td>
                          <td>
                            <span className={styles.expirationCell}>
                              {batch.expiration_date ? formatDateOnly(batch.expiration_date) : "Não aplicável"}
                              <small className={expiration.className}>{expiration.label}</small>
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={styles.mobileList} aria-label="Entradas em cartões">
                {batches.map((batch) => {
                  const item = itemById.get(batch.item_id);
                  const status = getStatus(batch);
                  const expiration = getExpirationStatus(batch, item);
                  return (
                    <article className={styles.entryCard} key={batch.id}>
                      <header>
                        <ProductImage
                          name={item?.name ?? `Produto ${batch.item_id}`}
                          src={item?.image_path}
                          size="card"
                        />
                        <div>
                          <h2>{item?.name ?? `Produto #${batch.item_id}`}</h2>
                          <p>{formatDateOnly(batch.entry_date)} · {formatStockSourceType(batch.source_type)}</p>
                        </div>
                        <span className={`${styles.statusBadge} ${status.className}`}>
                          {status.label}
                        </span>
                      </header>
                      <dl>
                        <div>
                          <dt>Lote</dt>
                          <dd>{batch.batch_code ?? `Lote #${batch.id}`}</dd>
                        </div>
                        <div>
                          <dt>Quantidade recebida</dt>
                          <dd>{new Intl.NumberFormat("pt-BR").format(batch.entry_quantity)} {item?.unit_measure ?? "un."}</dd>
                        </div>
                        <div>
                          <dt>Validade</dt>
                          <dd>{batch.expiration_date ? formatDateOnly(batch.expiration_date) : "Não aplicável"}</dd>
                        </div>
                        <div>
                          <dt>Controle</dt>
                          <dd className={expiration.className}>{expiration.label}</dd>
                        </div>
                      </dl>
                      {batch.storage_location ? (
                        <p className={styles.location}>
                          <MapPin aria-hidden="true" /> {batch.storage_location}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <footer className={styles.pagination}>
                <span>Mostrando {resultStart} a {resultEnd} de {total} entradas</span>
                <nav aria-label="Paginação das entradas">
                  <button
                    type="button"
                    aria-label="Página anterior"
                    disabled={activeOffset === 0}
                    onClick={() => goToOffset(Math.max(0, activeOffset - PAGE_SIZE))}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <span>Página {currentPage} de {totalPages}</span>
                  <button
                    type="button"
                    aria-label="Próxima página"
                    disabled={activeOffset + PAGE_SIZE >= total}
                    onClick={() => goToOffset(activeOffset + PAGE_SIZE)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </nav>
              </footer>
            </>
          )}
        </section>

        <aside className={styles.formColumn} aria-label="Cadastro rápido de entrada">
          <StockBatchFormPanel
            availableItems={activeItems}
            isLoadingAvailableItems={isLoading}
            onCreated={handleCreated}
          />
        </aside>
      </div>
    </div>
  );
}
