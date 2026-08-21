import { useEffect, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  History,
  MapPin,
  PackageCheck,
  Plus,
  Save,
  Search,
  Truck,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  DeliveryFromScheduleCreatePayload,
  DeliveryOperationItemResponse,
  DeliveryOperationsPeriod,
  DeliveryOperationsResponse,
  DeliveryOperationsStatus,
  DeliveryOperationsSummaryResponse,
  DeliveryResponse,
  DeliveryScheduleUpdatePayload,
} from "../types/delivery";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateOnly, formatDateTime } from "../utils/format";
import {
  buildListSearchParams,
  getQueryOffset,
  getQueryText,
} from "../utils/list-query";
import styles from "./DeliveriesPage.module.css";

const PAGE_SIZE = 8;
const HISTORY_PAGE_SIZE = 6;

const EMPTY_SUMMARY: DeliveryOperationsSummaryResponse = {
  scheduled: 0,
  rescheduled: 0,
  completed: 0,
  exceptions: 0,
  total: 0,
};

const PERIODS: Array<{ value: DeliveryOperationsPeriod; label: string }> = [
  { value: "hoje", label: "Hoje" },
  { value: "amanha", label: "Amanhã" },
  { value: "semana", label: "Esta semana" },
  { value: "todos", label: "Todos" },
];

const STATUS_OPTIONS: Array<{
  value: DeliveryOperationsStatus;
  label: string;
  summaryKey: keyof DeliveryOperationsSummaryResponse;
  icon: typeof CalendarDays;
  tone: string;
}> = [
  {
    value: "agendado",
    label: "Agendadas",
    summaryKey: "scheduled",
    icon: CalendarDays,
    tone: styles.metricScheduled,
  },
  {
    value: "reagendado",
    label: "Reagendadas",
    summaryKey: "rescheduled",
    icon: Clock3,
    tone: styles.metricRescheduled,
  },
  {
    value: "retirado",
    label: "Concluídas",
    summaryKey: "completed",
    icon: Check,
    tone: styles.metricCompleted,
  },
  {
    value: "ocorrencia",
    label: "Ocorrências",
    summaryKey: "exceptions",
    icon: CircleAlert,
    tone: styles.metricException,
  },
];

type ScheduleDraft = {
  schedule_id: number;
  scheduled_date: string;
  status: string;
  notes: string;
};

function getPositiveInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getStatus(value: string) {
  if (value === "retirado") {
    return { label: "Concluída", className: styles.statusCompleted };
  }
  if (value === "reagendado") {
    return { label: "Reagendada", className: styles.statusRescheduled };
  }
  if (value === "cancelado") {
    return { label: "Cancelada", className: styles.statusCanceled };
  }
  if (value === "faltou") {
    return { label: "Não compareceu", className: styles.statusMissing };
  }
  return { label: "Agendada", className: styles.statusScheduled };
}

function formatScheduleCode(id: number) {
  return `AGE-${String(id).padStart(6, "0")}`;
}

function formatFamilyStatus(status: string) {
  if (status === "apta_recorrente") return "Apta recorrente";
  if (status === "apta_emergencial") return "Apta emergencial";
  if (status === "inapta") return "Inapta";
  if (status === "inativa") return "Inativa";
  return "Em avaliação";
}

function isEligibleFamily(status: string) {
  return status === "apta_recorrente" || status === "apta_emergencial";
}

function formatAddress(item: DeliveryOperationItemResponse) {
  return `${item.street}, ${item.number}${item.complement ? ` · ${item.complement}` : ""}`;
}

function getHistoryOffset(searchParams: URLSearchParams) {
  const value = Number(searchParams.get("historyOffset") ?? "0");
  return Number.isInteger(value) && value > 0 ? value : 0;
}

export function DeliveriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPeriod = getQueryText(searchParams, "period");
  const activePeriod = PERIODS.some((period) => period.value === rawPeriod)
    ? (rawPeriod as DeliveryOperationsPeriod)
    : "hoje";
  const rawStatus = getQueryText(searchParams, "status");
  const activeStatus = STATUS_OPTIONS.some((status) => status.value === rawStatus)
    ? (rawStatus as DeliveryOperationsStatus)
    : "";
  const activeSearch = getQueryText(searchParams, "q");
  const activeOffset = getQueryOffset(searchParams);
  const selectedFromUrl = getPositiveInteger(getQueryText(searchParams, "selected"));
  const activeHistoryOffset = getHistoryOffset(searchParams);
  const isHistoryOpen = getQueryText(searchParams, "view") === "history";

  const [overview, setOverview] = useState<DeliveryOperationsResponse | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryResponse[]>([]);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    void Promise.all([
      api.get<DeliveryOperationsResponse>("/delivery-operations", {
        params: {
          q: activeSearch || undefined,
          period: activePeriod,
          status: activeStatus || undefined,
          limit: PAGE_SIZE,
          offset: activeOffset,
        },
      }),
      api.get<DeliveryResponse[]>("/deliveries", {
        params: { limit: HISTORY_PAGE_SIZE, offset: activeHistoryOffset },
      }),
    ])
      .then(([operationsResponse, deliveriesResponse]) => {
        if (!isCurrent) return;
        setOverview(operationsResponse.data);
        setDeliveries(deliveriesResponse.data);
        const historyTotal = Number(deliveriesResponse.headers["x-total-count"]);
        setTotalDeliveries(
          Number.isFinite(historyTotal) ? historyTotal : deliveriesResponse.data.length,
        );
        setError("");
      })
      .catch((requestError) => {
        if (!isCurrent) return;
        setError(
          getApiErrorMessage(
            requestError,
            "Não foi possível carregar a operação de entregas.",
          ),
        );
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [
    activeHistoryOffset,
    activeOffset,
    activePeriod,
    activeSearch,
    activeStatus,
    refreshKey,
  ]);

  const items = overview?.items ?? [];
  const summary = overview?.summary ?? EMPTY_SUMMARY;
  const total = overview?.total ?? 0;
  const selectedId = selectedFromUrl ?? items[0]?.id ?? null;
  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const currentPage = Math.floor(activeOffset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resultStart = total === 0 ? 0 : activeOffset + 1;
  const resultEnd = Math.min(activeOffset + items.length, total);
  const selectedDraft = selectedItem
    ? draft?.schedule_id === selectedItem.id
      ? draft
      : {
          schedule_id: selectedItem.id,
          scheduled_date: selectedItem.scheduled_date,
          status: selectedItem.status,
          notes: selectedItem.notes ?? "",
        }
    : null;

  function updateQuery(values: Record<string, string | number | null>) {
    setSearchParams((current) => buildListSearchParams(current, values));
  }

  function handlePeriod(period: DeliveryOperationsPeriod) {
    setIsLoading(true);
    updateQuery({ period: period === "hoje" ? null : period, offset: null, selected: null });
  }

  function handleStatus(status: DeliveryOperationsStatus) {
    setIsLoading(true);
    updateQuery({
      status: activeStatus === status ? null : status,
      offset: null,
      selected: null,
    });
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsLoading(true);
    updateQuery({
      q: String(formData.get("delivery_search") ?? "").trim(),
      offset: null,
      selected: null,
    });
  }

  function handleRefresh(message: string) {
    setDraft(null);
    setIsLoading(true);
    setSuccessMessage(message);
    setRefreshKey((current) => current + 1);
  }

  async function handleSaveSchedule() {
    if (!selectedItem || !selectedDraft) return;
    try {
      setError("");
      setSuccessMessage("");
      setIsSubmitting(true);
      const payload: DeliveryScheduleUpdatePayload = {
        scheduled_date: selectedDraft.scheduled_date,
        status: selectedDraft.status,
        notes: selectedDraft.notes.trim() || null,
      };
      await api.put(`/delivery-schedules/${selectedItem.id}`, payload);
      handleRefresh("Agendamento atualizado com auditoria registrada.");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Não foi possível atualizar o agendamento."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelivery() {
    if (!selectedItem) return;
    try {
      setError("");
      setSuccessMessage("");
      setIsSubmitting(true);
      const payload: DeliveryFromScheduleCreatePayload = {
        delivery_date: new Date().toISOString(),
        status: "concluida",
        notes: "Entrega registrada pela interface.",
      };
      await api.post(`/deliveries/from-schedule/${selectedItem.id}`, payload);
      handleRefresh("Entrega confirmada e estoque baixado automaticamente.");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Não foi possível confirmar a entrega."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelSchedule() {
    if (!selectedItem) return;
    if (!window.confirm("Cancelar este agendamento?")) return;
    try {
      setError("");
      setSuccessMessage("");
      setIsSubmitting(true);
      await api.put(`/delivery-schedules/${selectedItem.id}`, {
        scheduled_date: selectedItem.scheduled_date,
        status: "cancelado",
        notes: selectedItem.notes ?? "Cancelado pela interface.",
      } satisfies DeliveryScheduleUpdatePayload);
      handleRefresh("Agendamento cancelado.");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Não foi possível cancelar o agendamento."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAgendaPage(page: number) {
    setIsLoading(true);
    updateQuery({ offset: (page - 1) * PAGE_SIZE || null, selected: null });
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Entregas</h1>
          <p>Agende, acompanhe e confirme a distribuição das cestas para as famílias.</p>
        </div>
        <button
          type="button"
          className={styles.historyToggle}
          aria-pressed={isHistoryOpen}
          onClick={() => updateQuery({ view: isHistoryOpen ? null : "history" })}
        >
          <History aria-hidden="true" />
          Histórico rastreável
        </button>
      </header>

      <section className={styles.metrics} aria-label="Indicadores de entregas no período">
        {STATUS_OPTIONS.map((metric) => {
          const Icon = metric.icon;
          return (
            <button
              key={metric.value}
              type="button"
              className={`${styles.metricCard} ${metric.tone}${activeStatus === metric.value ? ` ${styles.metricActive}` : ""}`}
              aria-pressed={activeStatus === metric.value}
              onClick={() => handleStatus(metric.value)}
            >
              <span className={styles.metricIcon}><Icon aria-hidden="true" /></span>
              <span className={styles.metricCopy}>
                <span>{metric.label}</span>
                <strong>{summary[metric.summaryKey]}</strong>
                <small>{activePeriod === "todos" ? "Todo o histórico" : "No período"}</small>
              </span>
            </button>
          );
        })}
      </section>

      {error ? <div className={styles.feedbackError} role="alert">{error}</div> : null}
      {successMessage ? (
        <div className={styles.feedbackSuccess} role="status">{successMessage}</div>
      ) : null}

      {isHistoryOpen ? (
        <section className={styles.historyPanel} aria-labelledby="delivery-history-title">
          <div className={styles.sectionHeading}>
            <div>
              <span>Baixa de estoque auditável</span>
              <h2 id="delivery-history-title">Histórico rastreável</h2>
              <p>Itens e lotes efetivamente consumidos em cada entrega concluída.</p>
            </div>
            <button type="button" onClick={() => updateQuery({ view: null, historyOffset: null })}>
              Voltar à agenda
            </button>
          </div>

          {isLoading ? (
            <div className={styles.historyLoading}>Carregando histórico…</div>
          ) : deliveries.length === 0 ? (
            <div className={styles.emptyState}>
              <PackageCheck aria-hidden="true" />
              <strong>Nenhuma entrega concluída</strong>
              <p>As baixas rastreáveis aparecerão aqui após a confirmação.</p>
            </div>
          ) : (
            <div className={styles.historyList}>
              {deliveries.map((delivery) => (
                <article key={delivery.id} className={styles.historyCard}>
                  <header>
                    <div>
                      <span>Entrega #{delivery.id} · {formatDateTime(delivery.delivery_date)}</span>
                      <h3>Família #{delivery.family_id}</h3>
                    </div>
                    <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>
                      Concluída
                    </span>
                  </header>
                  {delivery.items.length ? (
                    <ul>
                      {delivery.items.map((item) => (
                        <li key={item.movement_id}>
                          <span>
                            <strong>{item.item_name}</strong>
                            <small>
                              {item.batch_code ? `Lote ${item.batch_code}` : `Lote #${item.batch_id}`}
                              {item.storage_location ? ` · ${item.storage_location}` : ""}
                              {item.expiration_date ? ` · Validade ${formatDateOnly(item.expiration_date)}` : ""}
                            </small>
                          </span>
                          <b>{item.quantity} {item.unit_measure}</b>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Registro anterior à rastreabilidade detalhada de lotes.</p>
                  )}
                </article>
              ))}
            </div>
          )}

          <footer className={styles.pagination}>
            <span>{totalDeliveries} entregas registradas</span>
            <nav aria-label="Paginação do histórico de entregas">
              <button
                type="button"
                aria-label="Página anterior do histórico"
                disabled={activeHistoryOffset === 0}
                onClick={() => updateQuery({ historyOffset: Math.max(0, activeHistoryOffset - HISTORY_PAGE_SIZE) || null })}
              ><ChevronLeft aria-hidden="true" /></button>
              <button
                type="button"
                aria-label="Próxima página do histórico"
                disabled={activeHistoryOffset + HISTORY_PAGE_SIZE >= totalDeliveries}
                onClick={() => updateQuery({ historyOffset: activeHistoryOffset + HISTORY_PAGE_SIZE })}
              ><ChevronRight aria-hidden="true" /></button>
            </nav>
          </footer>
        </section>
      ) : (
        <div className={styles.workspace}>
          <section className={styles.agendaPanel} aria-labelledby="delivery-agenda-title">
            <h2 id="delivery-agenda-title" className={styles.srOnly}>Agenda de entregas</h2>
            <div className={styles.toolbar}>
              <div className={styles.periodTabs} role="group" aria-label="Período da agenda">
                {PERIODS.map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    className={activePeriod === period.value ? styles.periodActive : ""}
                    aria-pressed={activePeriod === period.value}
                    onClick={() => handlePeriod(period.value)}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              <form className={styles.searchForm} onSubmit={handleSearch} role="search">
                <label>
                  <span className={styles.srOnly}>Buscar na agenda de entregas</span>
                  <Search aria-hidden="true" />
                  <input
                    key={activeSearch}
                    name="delivery_search"
                    type="search"
                    defaultValue={activeSearch}
                    placeholder="Buscar código, cesta ou endereço…"
                    autoComplete="off"
                  />
                </label>
              </form>

              <Link className={styles.primaryAction} to="/deliveries/schedules/new">
                <Plus aria-hidden="true" />
                Nova entrega
              </Link>
            </div>

            {isLoading ? (
              <div className={styles.loadingList} aria-label="Carregando agenda">
                {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
              </div>
            ) : error ? (
              <div className={styles.emptyState} role="alert">
                <CircleAlert aria-hidden="true" />
                <strong>Agenda indisponível</strong>
                <p>{error}</p>
              </div>
            ) : items.length === 0 ? (
              <div className={styles.emptyState}>
                <CalendarRange aria-hidden="true" />
                <strong>Nenhuma entrega neste período</strong>
                <p>Ajuste o período ou crie um novo agendamento.</p>
                <Link to="/deliveries/schedules/new">Agendar entrega</Link>
              </div>
            ) : (
              <>
                <div className={styles.desktopTable}>
                  <table aria-label="Agenda de entregas">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Família</th>
                        <th>Cesta</th>
                        <th>Endereço</th>
                        <th>Data</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const status = getStatus(item.status);
                        const isSelected = selectedItem?.id === item.id;
                        return (
                          <tr key={item.id} className={isSelected ? styles.selectedRow : ""}>
                            <td>
                              <button type="button" onClick={() => updateQuery({ selected: item.id })}>
                                {formatScheduleCode(item.id)}
                              </button>
                            </td>
                            <td><span className={styles.familyCell}><strong>{item.family_code}</strong><small>{formatFamilyStatus(item.family_status)}</small></span></td>
                            <td>{item.basket_type_name}</td>
                            <td><span className={styles.addressCell}><MapPin aria-hidden="true" /><span>{formatAddress(item)}<small>{item.neighborhood} · {item.city}/{item.state}</small></span></span></td>
                            <td>{formatDateOnly(item.scheduled_date)}</td>
                            <td><span className={`${styles.statusBadge} ${status.className}`}>{status.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.mobileList} aria-label="Agenda em cartões">
                  {items.map((item) => {
                    const status = getStatus(item.status);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={`${styles.deliveryCard}${selectedItem?.id === item.id ? ` ${styles.deliveryCardSelected}` : ""}`}
                        onClick={() => updateQuery({ selected: item.id })}
                      >
                        <span className={styles.cardTopline}>
                          <strong>{formatScheduleCode(item.id)}</strong>
                          <span className={`${styles.statusBadge} ${status.className}`}>{status.label}</span>
                        </span>
                        <span className={styles.cardIdentity}>
                          <b>{item.family_code}</b>
                          <small>{item.basket_type_name} · {formatFamilyStatus(item.family_status)}</small>
                        </span>
                        <span className={styles.cardMeta}><CalendarDays aria-hidden="true" /> {formatDateOnly(item.scheduled_date)}</span>
                        <span className={styles.cardMeta}><MapPin aria-hidden="true" /> {formatAddress(item)} · {item.neighborhood}</span>
                      </button>
                    );
                  })}
                </div>

                <footer className={styles.pagination}>
                  <span>Mostrando {resultStart} a {resultEnd} de {total} entregas</span>
                  <nav aria-label="Paginação da agenda">
                    <button type="button" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => handleAgendaPage(currentPage - 1)}><ChevronLeft aria-hidden="true" /></button>
                    <span>{currentPage} de {totalPages}</span>
                    <button type="button" aria-label="Próxima página" disabled={currentPage === totalPages} onClick={() => handleAgendaPage(currentPage + 1)}><ChevronRight aria-hidden="true" /></button>
                  </nav>
                </footer>
              </>
            )}
          </section>

          <aside className={styles.detailPanel} aria-label="Entrega selecionada">
            {selectedItem && selectedDraft ? (
              <>
                <div className={styles.detailHeader}>
                  <span className={styles.detailIcon}><Truck aria-hidden="true" /></span>
                  <div>
                    <span>{formatScheduleCode(selectedItem.id)}</span>
                    <h2>{selectedItem.family_code}</h2>
                    <p>{selectedItem.basket_type_name}</p>
                  </div>
                  <span className={`${styles.statusBadge} ${getStatus(selectedItem.status).className}`}>
                    {getStatus(selectedItem.status).label}
                  </span>
                </div>

                <dl className={styles.detailAddress}>
                  <div><dt>Endereço</dt><dd>{formatAddress(selectedItem)}<br />{selectedItem.neighborhood}<br />{selectedItem.city}/{selectedItem.state}</dd></div>
                </dl>

                <div className={`${styles.eligibilityNotice} ${isEligibleFamily(selectedItem.family_status) ? styles.eligibilityApproved : styles.eligibilityReview}`}>
                  <strong>{formatFamilyStatus(selectedItem.family_status)}</strong>
                  <span>{isEligibleFamily(selectedItem.family_status) ? "Decisão registrada na avaliação social." : "Revise a avaliação antes de concluir a entrega."}</span>
                </div>

                {selectedItem.status === "retirado" ? (
                  <div className={styles.completedNotice}>
                    <PackageCheck aria-hidden="true" />
                    <div><strong>Entrega concluída</strong><p>A baixa do estoque está disponível no histórico rastreável.</p></div>
                  </div>
                ) : (
                  <div className={styles.editForm}>
                    <label>
                      <span>Data agendada</span>
                      <input type="date" value={selectedDraft.scheduled_date} onChange={(event) => setDraft({ ...selectedDraft, scheduled_date: event.target.value })} />
                    </label>
                    <label>
                      <span>Situação</span>
                      <select value={selectedDraft.status} onChange={(event) => setDraft({ ...selectedDraft, status: event.target.value })}>
                        <option value="agendado">Agendada</option>
                        <option value="reagendado">Reagendada</option>
                        <option value="faltou">Não compareceu</option>
                        <option value="cancelado">Cancelada</option>
                      </select>
                    </label>
                    <label>
                      <span>Observações</span>
                      <textarea rows={3} value={selectedDraft.notes} onChange={(event) => setDraft({ ...selectedDraft, notes: event.target.value })} />
                    </label>
                    <button type="button" className={styles.saveAction} disabled={isSubmitting} onClick={() => void handleSaveSchedule()}><Save aria-hidden="true" /> Salvar alterações</button>
                  </div>
                )}

                {selectedItem.status === "agendado" && isEligibleFamily(selectedItem.family_status) ? (
                  <button type="button" className={styles.confirmAction} disabled={isSubmitting} onClick={() => void handleConfirmDelivery()}>
                    <Check aria-hidden="true" />
                    {isSubmitting ? "Processando…" : "Confirmar entrega"}
                  </button>
                ) : null}

                {!(["retirado", "cancelado"] as string[]).includes(selectedItem.status) ? (
                  <button type="button" className={styles.cancelAction} disabled={isSubmitting} onClick={() => void handleCancelSchedule()}>
                    <X aria-hidden="true" /> Cancelar agendamento
                  </button>
                ) : null}

                <button type="button" className={styles.traceAction} onClick={() => updateQuery({ view: "history" })}>
                  <History aria-hidden="true" /> Ver histórico rastreável
                </button>
              </>
            ) : (
              <div className={styles.emptyDetail}>
                <Truck aria-hidden="true" />
                <strong>Selecione uma entrega</strong>
                <p>Os dados operacionais e as ações seguras aparecerão aqui.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
