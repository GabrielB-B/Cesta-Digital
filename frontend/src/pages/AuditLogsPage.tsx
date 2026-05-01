import { useEffect, useState } from "react";
import { api } from "../api/client";
import { DataTable } from "../components/DataTable";
import { FormActions } from "../components/FormActions";
import { PageHeader } from "../components/PageHeader";
import { PanelHeader } from "../components/PanelHeader";
import { StateMessage } from "../components/StateMessage";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateTime } from "../utils/format";
import type { AuditLogItemResponse, AuditLogListResponse } from "../types/audit";

function formatEvent(eventType: string): string {
  return eventType.replaceAll(".", " / ");
}

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details) {
    return "Sem detalhes";
  }

  const preview = JSON.stringify(details);
  if (preview.length <= 120) {
    return preview;
  }

  return `${preview.slice(0, 117)}...`;
}

export function AuditLogsPage() {
  const [filters, setFilters] = useState({
    event_type: "",
    actor_email: "",
    entity_type: "",
  });
  const [logs, setLogs] = useState<AuditLogItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  async function loadAuditLogs(
    nextOffset = offset,
    activeFilters = filters
  ) {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.get<AuditLogListResponse>("/audit-logs", {
        params: {
          limit,
          offset: nextOffset,
          event_type: activeFilters.event_type || undefined,
          actor_email: activeFilters.actor_email || undefined,
          entity_type: activeFilters.entity_type || undefined,
        },
      });

      setLogs(response.data.items);
      setTotal(response.data.total);
      setOffset(nextOffset);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel carregar a auditoria."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAuditLogs(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadAuditLogs(0);
  }

  function handleClearFilters() {
    const clearedFilters = {
      event_type: "",
      actor_email: "",
      entity_type: "",
    };
    setFilters(clearedFilters);
    void loadAuditLogs(0, clearedFilters);
  }

  async function handleExportCsv() {
    try {
      setIsExporting(true);
      setError("");

      const response = await api.get<Blob>("/audit-logs/export", {
        params: {
          event_type: filters.event_type || undefined,
          actor_email: filters.actor_email || undefined,
          entity_type: filters.entity_type || undefined,
        },
        responseType: "blob",
      });

      const downloadUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "audit-logs.csv";
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel exportar a auditoria."));
    } finally {
      setIsExporting(false);
    }
  }

  const hasPreviousPage = offset > 0;
  const hasNextPage = offset + limit < total;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Auditoria"
        title="Trilha operacional"
        description="Consulte quem executou cada acao critica, em qual entidade e com qual request."
        meta={
          <div className="hero-badges">
            <span className="hero-badge">Registros: {total}</span>
            <span className="hero-badge">
              Pagina: {Math.floor(offset / limit) + 1}
            </span>
          </div>
        }
      />

      <form onSubmit={handleApplyFilters} className="panel-card form-panel">
        <PanelHeader eyebrow="Filtros" title="Refinar consulta" />

        <div className="form-grid">
          <label className="form__group">
            <span>Evento</span>
            <input
              name="event_type"
              value={filters.event_type}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  event_type: event.target.value,
                }))
              }
              placeholder="Ex.: auth.login_succeeded"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <label className="form__group">
            <span>Email do ator</span>
            <input
              type="email"
              name="actor_email"
              value={filters.actor_email}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  actor_email: event.target.value,
                }))
              }
              placeholder="usuario@dominio.com"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <label className="form__group">
            <span>Tipo de entidade</span>
            <input
              name="entity_type"
              value={filters.entity_type}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  entity_type: event.target.value,
                }))
              }
              placeholder="Ex.: family, user, delivery"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        </div>

        <FormActions spread>
          <button
            type="button"
            className="button button--secondary"
            onClick={handleClearFilters}
          >
            Limpar filtros
          </button>

          <button type="submit" className="button" disabled={isLoading}>
            {isLoading ? "Consultando..." : "Aplicar filtros"}
          </button>
        </FormActions>
      </form>

      <section className="panel-card">
        <PanelHeader
          eyebrow="Historico"
          title="Eventos recentes"
          actions={
            <div className="inline-actions">
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => void handleExportCsv()}
              disabled={isExporting}
            >
              {isExporting ? "Exportando..." : "Exportar CSV"}
            </button>
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => void loadAuditLogs(Math.max(0, offset - limit))}
              disabled={!hasPreviousPage || isLoading}
            >
              Anterior
            </button>
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => void loadAuditLogs(offset + limit)}
              disabled={!hasNextPage || isLoading}
            >
              Proxima
            </button>
          </div>
          }
        />

        {error ? (
          <StateMessage variant="error">{error}</StateMessage>
        ) : null}

        {isLoading ? (
          <StateMessage variant="loading">
            Carregando trilha de auditoria...
          </StateMessage>
        ) : logs.length === 0 ? (
          <StateMessage>
            Nenhum registro encontrado para os filtros atuais.
          </StateMessage>
        ) : (
          <DataTable caption="Eventos recentes da trilha de auditoria">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Evento</th>
                  <th>Ator</th>
                  <th>Entidade</th>
                  <th>Request</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.created_at)}</td>
                    <td>{formatEvent(log.event_type)}</td>
                    <td>{log.actor_email ?? "Sistema"}</td>
                    <td>
                      {log.entity_type
                        ? `${log.entity_type} #${log.entity_id ?? "?"}`
                        : "Sem entidade"}
                    </td>
                    <td>{log.request_id ?? "Sem request_id"}</td>
                    <td className="table-muted">{formatDetails(log.details)}</td>
                  </tr>
                ))}
              </tbody>
          </DataTable>
        )}
      </section>
    </div>
  );
}
