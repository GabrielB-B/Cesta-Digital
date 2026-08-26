import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Gift,
  Info,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  ReportDefinitionResponse,
  ReportKey,
  ReportsOverviewResponse,
} from "../types/report";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateOnly } from "../utils/format";
import { formatSaoPauloTodayForInput } from "../utils/stock";
import styles from "./ReportsPage.module.css";

const REPORT_ICON = {
  attendances: BarChart3,
  deliveries: PackageCheck,
  stock_movements: PackageOpen,
  benefits: Gift,
  families: UsersRound,
  stock_alerts: TriangleAlert,
} satisfies Record<ReportKey, typeof BarChart3>;

function getDefaultPeriod() {
  const end = formatSaoPauloTodayForInput();
  return {
    start: `${end.slice(0, 8)}01`,
    end,
  };
}

function isInputDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function extractFilename(disposition: string | undefined, fallback: string): string {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function ReportsPage() {
  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const startDate = isInputDate(searchParams.get("start_date"))
    ? searchParams.get("start_date")!
    : defaultPeriod.start;
  const endDate = isInputDate(searchParams.get("end_date"))
    ? searchParams.get("end_date")!
    : defaultPeriod.end;
  const selectedType = searchParams.get("type") || "all";
  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftEndDate, setDraftEndDate] = useState(endDate);
  const [overview, setOverview] = useState<ReportsOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadingKey, setDownloadingKey] = useState<ReportKey | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      try {
        setIsLoading(true);
        setError("");
        const response = await api.get<ReportsOverviewResponse>(
          "/reports/overview",
          { params: { start_date: startDate, end_date: endDate } },
        );
        if (isMounted) setOverview(response.data);
      } catch (requestError) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              requestError,
              "Não foi possível carregar os relatórios deste período.",
            ),
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadOverview();
    return () => {
      isMounted = false;
    };
  }, [startDate, endDate]);

  const visibleReports = useMemo(() => {
    const reports = overview?.available_reports ?? [];
    return selectedType === "all"
      ? reports
      : reports.filter((report) => report.key === selectedType);
  }, [overview?.available_reports, selectedType]);

  function applyPeriod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDownloadError("");
    const next = new URLSearchParams(searchParams);
    next.set("start_date", draftStartDate);
    next.set("end_date", draftEndDate);
    setSearchParams(next, { replace: true });
  }

  function changeReportType(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("type");
    else next.set("type", value);
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setDownloadError("");
    setDraftStartDate(defaultPeriod.start);
    setDraftEndDate(defaultPeriod.end);
    setSearchParams(
      { start_date: defaultPeriod.start, end_date: defaultPeriod.end },
      { replace: true },
    );
  }

  async function downloadReport(report: ReportDefinitionResponse) {
    try {
      setDownloadingKey(report.key);
      setDownloadError("");
      const response = await api.get<Blob>(`/reports/${report.key}/export`, {
        params: { start_date: startDate, end_date: endDate },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = extractFilename(
        response.headers["content-disposition"],
        `${report.key}-${startDate}-${endDate}.csv`,
      );
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setDownloadError(
        getApiErrorMessage(
          requestError,
          `Não foi possível gerar “${report.title}”.`,
        ),
      );
    } finally {
      setDownloadingKey(null);
    }
  }

  return (
    <main className={styles.page} aria-labelledby="reports-title">
      <header className={styles.pageHeader}>
        <h1 id="reports-title">Relatórios</h1>
        <p>Acompanhe os principais indicadores operacionais e de impacto social.</p>
      </header>

      <form className={styles.filters} onSubmit={applyPeriod}>
        <label className={styles.typeField}>
          <span>Tipo de relatório</span>
          <select
            value={selectedType}
            onChange={(event) => changeReportType(event.target.value)}
          >
            <option value="all">Todos os relatórios</option>
            {(overview?.available_reports ?? []).map((report) => (
              <option key={report.key} value={report.key}>
                {report.title}
              </option>
            ))}
          </select>
        </label>

        <fieldset className={styles.periodFields}>
          <legend>Período</legend>
          <label>
            <span>Data inicial</span>
            <span className={styles.dateControl}>
              <CalendarDays aria-hidden="true" />
              <input
                type="date"
                value={draftStartDate}
                max={draftEndDate}
                onChange={(event) => setDraftStartDate(event.target.value)}
                required
              />
            </span>
          </label>
          <span className={styles.periodSeparator} aria-hidden="true">até</span>
          <label>
            <span>Data final</span>
            <span className={styles.dateControl}>
              <CalendarDays aria-hidden="true" />
              <input
                type="date"
                value={draftEndDate}
                min={draftStartDate}
                onChange={(event) => setDraftEndDate(event.target.value)}
                required
              />
            </span>
          </label>
        </fieldset>

        <div className={styles.filterActions}>
          <button className={styles.applyButton} type="submit">
            <RefreshCw aria-hidden="true" />
            Atualizar
          </button>
          <button className={styles.clearButton} type="button" onClick={clearFilters}>
            <RotateCcw aria-hidden="true" />
            Limpar
          </button>
        </div>
      </form>

      {error ? (
        <section className={styles.errorState} role="alert">
          <TriangleAlert aria-hidden="true" />
          <div>
            <strong>Não foi possível atualizar os indicadores</strong>
            <p>{error}</p>
          </div>
        </section>
      ) : null}

      <section className={styles.kpiGrid} aria-label="Indicadores do período">
        <article className={styles.kpiCard}>
          <span className={`${styles.kpiIcon} ${styles.pinkIcon}`}><UsersRound /></span>
          <div>
            <span>Famílias atendidas</span>
            <strong>{isLoading ? "—" : formatCount(overview?.kpis.families_served ?? 0)}</strong>
            <small>{formatDateOnly(startDate)} a {formatDateOnly(endDate)}</small>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <span className={`${styles.kpiIcon} ${styles.purpleIcon}`}><PackageCheck /></span>
          <div>
            <span>Cestas entregues</span>
            <strong>{isLoading ? "—" : formatCount(overview?.kpis.baskets_delivered ?? 0)}</strong>
            <small>Entregas concluídas no período</small>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <span className={`${styles.kpiIcon} ${styles.greenIcon}`}><Gift /></span>
          <div>
            <span>Itens distribuídos</span>
            <strong>{isLoading ? "—" : formatCount(overview?.kpis.items_distributed ?? 0)}</strong>
            <small>Unidades baixadas em entregas</small>
          </div>
        </article>
      </section>

      <section className={styles.reportsPanel} aria-labelledby="available-reports-title">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="available-reports-title">Relatórios disponíveis</h2>
            <p>Os arquivos respeitam o período e as permissões do seu perfil.</p>
          </div>
          <span>{visibleReports.length} {visibleReports.length === 1 ? "opção" : "opções"}</span>
        </div>

        {downloadError ? (
          <p className={styles.downloadError} role="alert">{downloadError}</p>
        ) : null}

        {isLoading ? (
          <div className={styles.loadingGrid} aria-label="Carregando relatórios">
            {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
          </div>
        ) : visibleReports.length === 0 ? (
          <div className={styles.emptyState}>
            <FileSpreadsheet aria-hidden="true" />
            <strong>Nenhum relatório corresponde ao filtro</strong>
            <p>Limpe o tipo selecionado para voltar a visualizar as opções disponíveis.</p>
          </div>
        ) : (
          <div className={styles.reportGrid}>
            {visibleReports.map((report, index) => {
              const Icon = REPORT_ICON[report.key];
              const isDownloading = downloadingKey === report.key;
              return (
                <article className={styles.reportCard} key={report.key}>
                  <span className={`${styles.reportIcon} ${styles[`reportIcon${index % 6}`]}`}>
                    <Icon aria-hidden="true" />
                  </span>
                  <div className={styles.reportCopy}>
                    <strong>{report.title}</strong>
                    <p>{report.description}</p>
                    <small>{report.uses_period ? "Período selecionado" : "Posição atual"} · CSV</small>
                  </div>
                  <button
                    type="button"
                    className={styles.downloadButton}
                    onClick={() => void downloadReport(report)}
                    disabled={Boolean(downloadingKey)}
                    aria-label={`Baixar ${report.title} em CSV`}
                  >
                    {isDownloading ? <RefreshCw className={styles.spinning} /> : <Download />}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        <div className={styles.formatNotice}>
          <Info aria-hidden="true" />
          <p>Os relatórios são gerados em CSV UTF-8, compatível com Excel e outros editores de planilhas.</p>
        </div>
      </section>
    </main>
  );
}
