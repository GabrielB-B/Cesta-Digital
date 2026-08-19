import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  FamilyDetailResponse,
  FamilyListItemResponse,
} from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";
import { formatCurrency, formatDateOnly } from "../utils/format";
import {
  buildListSearchParams,
  getQueryOffset,
  getQueryText,
} from "../utils/list-query";
import styles from "./FamiliesPage.module.css";

const PAGE_SIZE = 25;

const familyStatusOptions = [
  { value: "", label: "Todos os status" },
  { value: "apta_recorrente", label: "Apta recorrente" },
  { value: "apta_emergencial", label: "Apta emergencial" },
  { value: "em_analise", label: "Em análise" },
  { value: "inapta", label: "Inapta" },
  { value: "inativa", label: "Inativa" },
];

function formatStatus(status: string): string {
  return familyStatusOptions.find((option) => option.value === status)?.label ?? status;
}

function getStatusTone(status: string): string {
  if (status === "apta_recorrente") return styles.statusSuccess;
  if (status === "apta_emergencial") return styles.statusInfo;
  if (status === "em_analise") return styles.statusWarning;
  return styles.statusInactive;
}

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

export function FamiliesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSearch = getQueryText(searchParams, "q");
  const activeStatus = getQueryText(searchParams, "status");
  const activeOffset = getQueryOffset(searchParams);
  const selectedFromUrl = getSelectedId(getQueryText(searchParams, "selected"));
  const [families, setFamilies] = useState<FamilyListItemResponse[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilyDetailResponse | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(Boolean(activeStatus));
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    void api
      .get<FamilyListItemResponse[]>("/families", {
        params: {
          q: activeSearch || undefined,
          status: activeStatus || undefined,
          limit: PAGE_SIZE,
          offset: activeOffset,
        },
      })
      .then((response) => {
        if (!isCurrent) return;
        setFamilies(response.data);
        setTotal(Number(response.headers["x-total-count"] ?? response.data.length));
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(
            getApiErrorMessage(requestError, "Não foi possível carregar as famílias."),
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeOffset, activeSearch, activeStatus]);

  const selectedFamilyId = selectedFromUrl ?? families[0]?.id ?? null;

  useEffect(() => {
    if (!selectedFamilyId) return;

    let isCurrent = true;

    void api
      .get<FamilyDetailResponse>(`/families/${selectedFamilyId}`)
      .then((response) => {
        if (isCurrent) {
          setSelectedFamily(response.data);
          setDetailError("");
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setDetailError(
            getApiErrorMessage(requestError, "Não foi possível carregar o resumo."),
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedFamilyId]);

  const currentPage = Math.floor(activeOffset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resultStart = total === 0 ? 0 : activeOffset + 1;
  const resultEnd = Math.min(activeOffset + families.length, total);
  const responsiblePerson = selectedFamily?.people.find(
    (person) => person.is_family_responsible,
  );
  const primaryContact = selectedFamily?.contacts[0];

  function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextSearch = String(formData.get("families_search") ?? "").trim();
    const nextStatus = String(formData.get("family_status") ?? "");
    setIsLoading(true);
    setError("");
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, {
        q: nextSearch,
        status: nextStatus,
        offset: null,
        selected: null,
      }),
    );
  }

  function handleClearFilters() {
    setIsFiltersOpen(false);
    setIsLoading(true);
    setError("");
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, {
        q: null,
        status: null,
        offset: null,
        selected: null,
      }),
    );
  }

  function handlePageChange(page: number) {
    setIsLoading(true);
    setError("");
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, {
        offset: (page - 1) * PAGE_SIZE || null,
        selected: null,
      }),
    );
  }

  function handleSelectFamily(familyId: number) {
    setDetailError("");
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, { selected: familyId }),
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Famílias</h1>
          <p>Gerencie os cadastros e acompanhe a situação social das famílias.</p>
        </div>
      </header>

      <form
        key={`family-search-${activeSearch}-${activeStatus}`}
        className={styles.toolbar}
        onSubmit={handleApplyFilters}
        role="search"
      >
        <label className={styles.searchField}>
          <span className={styles.srOnly}>Buscar famílias</span>
          <Search aria-hidden="true" />
          <input
            type="search"
            name="families_search"
            placeholder="Buscar por código, bairro, cidade ou status…"
            defaultValue={activeSearch}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <button
          className={`${styles.filterButton}${activeStatus ? ` ${styles.filterButtonActive}` : ""}`}
          type="button"
          aria-expanded={isFiltersOpen}
          aria-controls="family-filters"
          onClick={() => setIsFiltersOpen((current) => !current)}
        >
          <SlidersHorizontal aria-hidden="true" />
          Filtros
          {activeStatus ? <span className={styles.filterCount}>1</span> : null}
        </button>

        <Link className={styles.primaryAction} to="/families/new">
          <Plus aria-hidden="true" />
          Nova família
        </Link>

        {isFiltersOpen ? (
          <div id="family-filters" className={styles.filterPanel}>
            <label>
              <span>Status da família</span>
              <select
                name="family_status"
                defaultValue={activeStatus}
              >
                {familyStatusOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.filterActions}>
              <button type="button" onClick={handleClearFilters}>
                Limpar
              </button>
              <button type="submit">Aplicar filtros</button>
            </div>
          </div>
        ) : null}
      </form>

      <div className={styles.workspace}>
        <section className={styles.listPanel} aria-label="Famílias cadastradas">
          {isLoading ? (
            <div className={styles.loadingList} aria-live="polite" aria-busy="true">
              <span>Carregando famílias…</span>
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className={styles.skeletonRow} />
              ))}
            </div>
          ) : error ? (
            <div className={styles.stateMessage} role="alert">
              <strong>Não foi possível carregar a lista</strong>
              <span>{error}</span>
            </div>
          ) : families.length === 0 ? (
            <div className={styles.stateMessage}>
              <strong>Nenhuma família encontrada</strong>
              <span>Revise a busca ou remova os filtros aplicados.</span>
              <button type="button" onClick={handleClearFilters}>Limpar filtros</button>
            </div>
          ) : (
            <>
              <div className={styles.desktopTable}>
                <table>
                  <caption className={styles.srOnly}>Famílias cadastradas</caption>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Região</th>
                      <th>Status</th>
                      <th>Moradores</th>
                      <th>Renda per capita</th>
                      <th>Última avaliação</th>
                      <th><span className={styles.srOnly}>Selecionar</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {families.map((family) => {
                      const isSelected = family.id === selectedFamilyId;
                      return (
                        <tr key={family.id} className={isSelected ? styles.selectedRow : undefined}>
                          <td>
                            <button
                              className={styles.codeButton}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => handleSelectFamily(family.id)}
                            >
                              {family.internal_code}
                            </button>
                          </td>
                          <td>
                            <span className={styles.regionCell}>
                              <strong>{family.neighborhood}</strong>
                              <span>{family.city}/{family.state}</span>
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${getStatusTone(family.status)}`}>
                              {formatStatus(family.status)}
                            </span>
                          </td>
                          <td>{family.total_residents}</td>
                          <td>{formatCurrency(family.income_per_capita)}</td>
                          <td>{family.last_evaluation_date ? formatDateOnly(family.last_evaluation_date) : "Não realizada"}</td>
                          <td>
                            <button
                              className={styles.selectButton}
                              type="button"
                              aria-label={`Selecionar ${family.internal_code}`}
                              aria-pressed={isSelected}
                              onClick={() => handleSelectFamily(family.id)}
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
                {families.map((family) => (
                  <Link key={family.id} to={`/families/${family.id}`} className={styles.familyCard}>
                    <span className={styles.familyCardTop}>
                      <strong>{family.internal_code}</strong>
                      <span className={`${styles.statusBadge} ${getStatusTone(family.status)}`}>
                        {formatStatus(family.status)}
                      </span>
                    </span>
                    <span className={styles.familyCardRegion}>
                      <MapPin aria-hidden="true" />
                      {family.neighborhood} · {family.city}/{family.state}
                    </span>
                    <span className={styles.familyCardMeta}>
                      <span><UsersRound aria-hidden="true" />{family.total_residents} moradores</span>
                      <span><CalendarDays aria-hidden="true" />{family.last_evaluation_date ? formatDateOnly(family.last_evaluation_date) : "Sem avaliação"}</span>
                    </span>
                    <span className={styles.cardAction}>Ver detalhes <ChevronRight aria-hidden="true" /></span>
                  </Link>
                ))}
              </div>

              <footer className={styles.pagination}>
                <span>Mostrando {resultStart} a {resultEnd} de {total} famílias</span>
                <nav aria-label="Paginação de famílias">
                  <button
                    type="button"
                    aria-label="Página anterior"
                    disabled={currentPage === 1 || isLoading}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  {getPaginationItems(currentPage, totalPages).map((item, index) =>
                    item === "ellipsis" ? (
                      <span key={`ellipsis-${index}`} className={styles.ellipsis}>…</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        aria-current={item === currentPage ? "page" : undefined}
                        aria-label={`Página ${item}`}
                        onClick={() => handlePageChange(item)}
                      >
                        {item}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    aria-label="Próxima página"
                    disabled={currentPage === totalPages || isLoading}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </nav>
              </footer>
            </>
          )}
        </section>

        <aside className={styles.summaryPanel} aria-label="Família selecionada">
          <h2>Família selecionada</h2>
          {selectedFamilyId && selectedFamily?.id !== selectedFamilyId ? (
            <div className={styles.summaryLoading} aria-live="polite">Carregando resumo…</div>
          ) : detailError ? (
            <p className={styles.summaryError} role="alert">{detailError}</p>
          ) : selectedFamily && selectedFamily.id === selectedFamilyId ? (
            <>
              <div className={styles.summaryIdentity}>
                <span className={styles.familyIcon}><UsersRound aria-hidden="true" /></span>
                <div>
                  <strong>{selectedFamily.internal_code}</strong>
                  <span className={`${styles.statusBadge} ${getStatusTone(selectedFamily.status)}`}>
                    {formatStatus(selectedFamily.status)}
                  </span>
                </div>
              </div>

              <dl className={styles.summaryDetails}>
                <div>
                  <dt><UserRound aria-hidden="true" />Pessoa responsável</dt>
                  <dd>{responsiblePerson?.full_name ?? "Não informada"}</dd>
                </div>
                <div>
                  <dt><Phone aria-hidden="true" />Contato principal</dt>
                  <dd>{primaryContact?.contact_name ?? "Não informado"}</dd>
                  {primaryContact?.phone ? <dd className={styles.secondaryValue}>{primaryContact.phone}</dd> : null}
                </div>
                <div>
                  <dt><MapPin aria-hidden="true" />Endereço</dt>
                  <dd>{selectedFamily.street}, {selectedFamily.number}</dd>
                  <dd>{selectedFamily.neighborhood}</dd>
                  <dd>{selectedFamily.city}/{selectedFamily.state}{selectedFamily.zip_code ? ` · CEP ${selectedFamily.zip_code}` : ""}</dd>
                </div>
                <div>
                  <dt><CalendarDays aria-hidden="true" />Última avaliação</dt>
                  <dd>{selectedFamily.last_evaluation_date ? formatDateOnly(selectedFamily.last_evaluation_date) : "Não realizada"}</dd>
                </div>
                <div>
                  <dt><UsersRound aria-hidden="true" />Composição</dt>
                  <dd>{selectedFamily.total_residents} pessoas</dd>
                </div>
              </dl>

              <Link className={styles.detailButton} to={`/families/${selectedFamily.id}`}>
                Ver detalhes
              </Link>
            </>
          ) : (
            <p className={styles.summaryEmpty}>Selecione uma família para visualizar o resumo.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
