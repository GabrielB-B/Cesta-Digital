import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  AssessmentQueueItemResponse,
  AssessmentQueueResponse,
  AssessmentQueueStatus,
  AssessmentQueueSummaryResponse,
} from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateOnly } from "../utils/format";
import {
  buildListSearchParams,
  getQueryOffset,
  getQueryText,
} from "../utils/list-query";
import styles from "./AssessmentQueuePage.module.css";

const PAGE_SIZE = 25;

const emptySummary: AssessmentQueueSummaryResponse = {
  sem_avaliacao: 0,
  reavaliacao_vencida: 0,
  reavaliacao_proxima: 0,
  em_dia: 0,
  total: 0,
};

const statusFilters = [
  {
    value: "sem_avaliacao",
    label: "Sem avaliação",
    supportingText: "Aguardam primeira análise",
    icon: UserRound,
    tone: "pink",
  },
  {
    value: "reavaliacao_vencida",
    label: "Reavaliações vencidas",
    supportingText: "Exigem revisão imediata",
    icon: AlertTriangle,
    tone: "orange",
  },
  {
    value: "reavaliacao_proxima",
    label: "Próximas reavaliações",
    supportingText: "Vencem em até 30 dias",
    icon: CalendarClock,
    tone: "purple",
  },
  {
    value: "em_dia",
    label: "Avaliações em dia",
    supportingText: "Dentro do prazo definido",
    icon: CircleCheckBig,
    tone: "green",
  },
] as const satisfies readonly {
  value: AssessmentQueueStatus;
  label: string;
  supportingText: string;
  icon: typeof UserRound;
  tone: "pink" | "orange" | "purple" | "green";
}[];

function getSelectedId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatDecision(value: string | null): string {
  const labels: Record<string, string> = {
    apta_recorrente: "Apta recorrente",
    apta_emergencial: "Apta emergencial",
    em_analise: "Em análise",
    inapta: "Inapta",
    inativa: "Inativa",
  };
  return value ? labels[value] ?? value : "Sem decisão";
}

function formatPriority(value: string): string {
  const labels: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    urgente: "Urgente",
  };
  return labels[value] ?? value;
}

function formatQueueStatus(value: AssessmentQueueStatus): string {
  return statusFilters.find((status) => status.value === value)?.label ?? value;
}

function formatQueueReason(item: AssessmentQueueItemResponse): string {
  if (item.queue_reason === "nunca_avaliada") return "Primeira avaliação pendente";
  if (item.queue_reason === "prazo_nao_definido") return "Próximo prazo não definido";
  if (item.queue_reason === "prazo_vencido") return "Prazo de reavaliação vencido";
  if (item.queue_reason === "prazo_proximo") return "Reavaliar nos próximos 30 dias";
  return "Avaliação dentro do prazo";
}

function formatDate(value: string | null): string {
  return value ? formatDateOnly(value) : "Não registrada";
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, "ellipsis", totalPages] as const;
  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages] as const;
  }
  return [1, "ellipsis", currentPage, "ellipsis", totalPages] as const;
}

export function AssessmentQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSearch = getQueryText(searchParams, "q");
  const rawStatus = getQueryText(searchParams, "status");
  const activeStatus = statusFilters.some((status) => status.value === rawStatus)
    ? (rawStatus as AssessmentQueueStatus)
    : "";
  const activeOffset = getQueryOffset(searchParams);
  const selectedFromUrl = getSelectedId(getQueryText(searchParams, "selected"));
  const [items, setItems] = useState<AssessmentQueueItemResponse[]>([]);
  const [summary, setSummary] = useState<AssessmentQueueSummaryResponse>(emptySummary);
  const [total, setTotal] = useState(0);
  const [referenceDate, setReferenceDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    void api
      .get<AssessmentQueueResponse>("/social-assessments/queue", {
        params: {
          q: activeSearch || undefined,
          status: activeStatus || undefined,
          due_soon_days: 30,
          limit: PAGE_SIZE,
          offset: activeOffset,
        },
      })
      .then((response) => {
        if (!isCurrent) return;
        setItems(response.data.items);
        setSummary(response.data.summary);
        setTotal(response.data.total);
        setReferenceDate(response.data.reference_date);
        setError("");
      })
      .catch((requestError) => {
        if (!isCurrent) return;
        setError(
          getApiErrorMessage(
            requestError,
            "Não foi possível carregar a fila de avaliações.",
          ),
        );
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeOffset, activeSearch, activeStatus]);

  const selectedItem =
    items.find((item) => item.family_id === selectedFromUrl) ?? items[0] ?? null;
  const currentPage = Math.floor(activeOffset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resultStart = total === 0 ? 0 : activeOffset + 1;
  const resultEnd = Math.min(activeOffset + items.length, total);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextSearch = String(formData.get("assessment_search") ?? "").trim();
    setIsLoading(true);
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, {
        q: nextSearch,
        offset: null,
        selected: null,
      }),
    );
  }

  function handleStatusFilter(status: AssessmentQueueStatus) {
    setIsLoading(true);
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, {
        status: activeStatus === status ? null : status,
        offset: null,
        selected: null,
      }),
    );
  }

  function handleClearFilters() {
    setIsLoading(true);
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, {
        q: null,
        status: null,
        offset: null,
        selected: null,
      }),
    );
  }

  function handleSelect(familyId: number) {
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, { selected: familyId }),
    );
  }

  function handlePageChange(page: number) {
    setIsLoading(true);
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, {
        offset: (page - 1) * PAGE_SIZE || null,
        selected: null,
      }),
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Avaliações sociais</h1>
          <p>Revise a aptidão das famílias com base no cálculo e na decisão técnica.</p>
        </div>
        {referenceDate ? (
          <span className={styles.referenceDate}>
            <CalendarCheck2 aria-hidden="true" />
            Posição em {formatDateOnly(referenceDate)}
          </span>
        ) : null}
      </header>

      <section className={styles.statusGrid} aria-label="Situações da fila">
        {statusFilters.map((status) => {
          const Icon = status.icon;
          const isActive = activeStatus === status.value;
          return (
            <button
              key={status.value}
              className={`${styles.statusCard} ${styles[`statusCard${status.tone}`]}${isActive ? ` ${styles.statusCardActive}` : ""}`}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleStatusFilter(status.value)}
            >
              <span className={styles.statusIcon}><Icon aria-hidden="true" /></span>
              <span className={styles.statusCopy}>
                <strong>{status.label}</strong>
                <small>{status.supportingText}</small>
              </span>
              <b>{summary[status.value]}</b>
            </button>
          );
        })}
      </section>

      <div className={styles.toolbarRow}>
        <form
          key={`assessment-search-${activeSearch}`}
          className={styles.searchForm}
          onSubmit={handleSearch}
          role="search"
        >
          <label className={styles.searchField}>
            <span className={styles.srOnly}>Buscar avaliações</span>
            <Search aria-hidden="true" />
            <input
              type="search"
              name="assessment_search"
              defaultValue={activeSearch}
              placeholder="Buscar por código, responsável, bairro ou cidade…"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button type="submit">Buscar</button>
        </form>

        {activeSearch || activeStatus ? (
          <button className={styles.clearButton} type="button" onClick={handleClearFilters}>
            Ver toda a fila
          </button>
        ) : null}

        {selectedItem ? (
          <Link
            className={styles.primaryAction}
            to={`/families/${selectedItem.family_id}/assessments/new`}
          >
            <Plus aria-hidden="true" />
            {selectedItem.latest_assessment_id ? "Nova reavaliação" : "Nova avaliação"}
          </Link>
        ) : (
          <Link className={styles.primaryAction} to="/families">
            <UsersRound aria-hidden="true" />
            Selecionar família
          </Link>
        )}
      </div>

      <div className={styles.workspace}>
        <section className={styles.queuePanel} aria-label="Fila de avaliações sociais">
          {isLoading ? (
            <div className={styles.loadingList} aria-live="polite" aria-busy="true">
              <span>Organizando a fila de avaliações…</span>
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className={styles.skeletonRow} />
              ))}
            </div>
          ) : error ? (
            <div className={styles.stateMessage} role="alert">
              <strong>Não foi possível carregar a fila</strong>
              <span>{error}</span>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.stateMessage}>
              <ShieldCheck aria-hidden="true" />
              <strong>Nenhuma avaliação nesta seleção</strong>
              <span>Revise a busca ou volte para a fila completa.</span>
              <button type="button" onClick={handleClearFilters}>Ver toda a fila</button>
            </div>
          ) : (
            <>
              <div className={styles.desktopTable}>
                <table>
                  <caption className={styles.srOnly}>Fila de avaliações sociais</caption>
                  <thead>
                    <tr>
                      <th>Família</th>
                      <th>Situação</th>
                      <th>Última decisão</th>
                      <th>Última avaliação</th>
                      <th>Próxima revisão</th>
                      <th>Prioridade</th>
                      <th><span className={styles.srOnly}>Selecionar</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const isSelected = item.family_id === selectedItem?.family_id;
                      return (
                        <tr key={item.family_id} className={isSelected ? styles.selectedRow : undefined}>
                          <td>
                            <button
                              className={styles.familyButton}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => handleSelect(item.family_id)}
                            >
                              <strong>{item.internal_code}</strong>
                              <span>{item.responsible_name ?? "Responsável não definido"}</span>
                            </button>
                          </td>
                          <td>
                            <span className={`${styles.queueBadge} ${styles[`queue${item.queue_status}`]}`}>
                              {formatQueueStatus(item.queue_status)}
                            </span>
                          </td>
                          <td>{formatDecision(item.latest_final_decision)}</td>
                          <td>{formatDate(item.latest_assessment_date)}</td>
                          <td className={item.queue_status === "reavaliacao_vencida" ? styles.overdueText : undefined}>
                            {formatDate(item.next_revaluation_date)}
                          </td>
                          <td>
                            <span className={`${styles.priorityBadge} ${styles[`priority${item.current_priority_level}`]}`}>
                              {formatPriority(item.current_priority_level)}
                            </span>
                          </td>
                          <td>
                            <button
                              className={styles.selectButton}
                              type="button"
                              aria-label={`Selecionar ${item.internal_code}`}
                              onClick={() => handleSelect(item.family_id)}
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
                {items.map((item) => (
                  <article key={item.family_id} className={styles.queueCard}>
                    <div className={styles.cardTop}>
                      <div>
                        <strong>{item.internal_code}</strong>
                        <span>{item.responsible_name ?? "Responsável não definido"}</span>
                      </div>
                      <span className={`${styles.queueBadge} ${styles[`queue${item.queue_status}`]}`}>
                        {formatQueueStatus(item.queue_status)}
                      </span>
                    </div>
                    <div className={styles.cardRegion}>
                      <MapPin aria-hidden="true" />
                      {item.neighborhood}, {item.city} — {item.state}
                    </div>
                    <dl className={styles.cardFacts}>
                      <div>
                        <dt>Última decisão</dt>
                        <dd>{formatDecision(item.latest_final_decision)}</dd>
                      </div>
                      <div>
                        <dt>Próxima revisão</dt>
                        <dd>{formatDate(item.next_revaluation_date)}</dd>
                      </div>
                    </dl>
                    {item.current_preview_differs_from_decision ? (
                      <p className={styles.changeNotice}>
                        <AlertTriangle aria-hidden="true" />
                        O cálculo atual pede nova leitura técnica.
                      </p>
                    ) : null}
                    <div className={styles.cardActions}>
                      <Link to={`/families/${item.family_id}`}>Ver família</Link>
                      <Link to={`/families/${item.family_id}/assessments/new`}>
                        {item.latest_assessment_id ? "Reavaliar" : "Avaliar"}
                        <ChevronRight aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              <div className={styles.pagination}>
                <span>Mostrando {resultStart} a {resultEnd} de {total} famílias</span>
                <nav aria-label="Paginação da fila de avaliações">
                  <button
                    type="button"
                    aria-label="Página anterior"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  {getPaginationItems(currentPage, totalPages).map((page, index) =>
                    page === "ellipsis" ? (
                      <span key={`ellipsis-${index}`} className={styles.ellipsis}>…</span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        aria-label={`Página ${page}`}
                        aria-current={page === currentPage ? "page" : undefined}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    aria-label="Próxima página"
                    disabled={currentPage >= totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </>
          )}
        </section>

        <aside className={styles.detailPanel} aria-label="Avaliação selecionada">
          {selectedItem ? (
            <>
              <div className={styles.detailHeading}>
                <div>
                  <span className={styles.detailEyebrow}>Família selecionada</span>
                  <h2>{selectedItem.internal_code}</h2>
                </div>
                <span className={`${styles.queueBadge} ${styles[`queue${selectedItem.queue_status}`]}`}>
                  {formatQueueStatus(selectedItem.queue_status)}
                </span>
              </div>

              <div className={styles.familyContext}>
                <span><UserRound aria-hidden="true" />{selectedItem.responsible_name ?? "Responsável não definido"}</span>
                <span><UsersRound aria-hidden="true" />{selectedItem.total_residents} moradores</span>
                <span><MapPin aria-hidden="true" />{selectedItem.neighborhood}, {selectedItem.city} — {selectedItem.state}</span>
              </div>

              <section className={styles.readingCard}>
                <div className={styles.sectionTitle}>
                  <span className={styles.calculationIcon}><ShieldCheck aria-hidden="true" /></span>
                  <div>
                    <span>Cálculo com os dados atuais</span>
                    <strong>{formatDecision(selectedItem.current_system_suggestion)}</strong>
                  </div>
                </div>
                <dl>
                  <div><dt>Score social</dt><dd>{selectedItem.current_social_weight_score}</dd></div>
                  <div><dt>Prioridade</dt><dd>{formatPriority(selectedItem.current_priority_level)}</dd></div>
                </dl>
                <p>O cálculo orienta a análise. A decisão final continua sendo técnica.</p>
              </section>

              <section className={styles.decisionBlock}>
                <span>Última decisão registrada</span>
                <strong>{formatDecision(selectedItem.latest_final_decision)}</strong>
                <dl>
                  <div><dt>Avaliada em</dt><dd>{formatDate(selectedItem.latest_assessment_date)}</dd></div>
                  <div><dt>Por</dt><dd>{selectedItem.latest_approved_by_name ?? "Não informado"}</dd></div>
                  <div><dt>Próxima revisão</dt><dd>{formatDate(selectedItem.next_revaluation_date)}</dd></div>
                </dl>
              </section>

              {selectedItem.current_preview_differs_from_decision ? (
                <div className={styles.divergenceAlert}>
                  <AlertTriangle aria-hidden="true" />
                  <div>
                    <strong>A situação calculada mudou</strong>
                    <span>A sugestão atual difere da última decisão. Revise os dados antes de decidir.</span>
                  </div>
                </div>
              ) : (
                <div className={styles.queueReason}>
                  <Clock3 aria-hidden="true" />
                  <span>{formatQueueReason(selectedItem)}</span>
                </div>
              )}

              <div className={styles.detailActions}>
                <Link to={`/families/${selectedItem.family_id}/assessments/new`}>
                  {selectedItem.latest_assessment_id ? "Iniciar reavaliação" : "Iniciar avaliação"}
                  <ChevronRight aria-hidden="true" />
                </Link>
                <Link to={`/families/${selectedItem.family_id}`}>Ver histórico da família</Link>
              </div>
            </>
          ) : (
            <p className={styles.detailEmpty}>Selecione uma família para revisar a avaliação.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
