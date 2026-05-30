import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { DataTable } from "../components/DataTable";
import { FormActions } from "../components/FormActions";
import { PageHeader } from "../components/PageHeader";
import { PaginationControls } from "../components/PaginationControls";
import { PanelHeader } from "../components/PanelHeader";
import { StateMessage } from "../components/StateMessage";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateTime } from "../utils/format";
import type { AuditLogItemResponse, AuditLogListResponse } from "../types/audit";

type AuditTone = "success" | "warning" | "danger" | "change" | "neutral";

type AuditMeta = {
  action: string;
  area: string;
  areaBadge: string;
  result: string;
  tone: AuditTone;
};

type AuditFilters = {
  event_type: string;
  actor_email: string;
  entity_type: string;
  created_from: string;
  created_to: string;
};

const initialFilters: AuditFilters = {
  event_type: "",
  actor_email: "",
  entity_type: "",
  created_from: "",
  created_to: "",
};

const actionOptions = [
  { value: "", label: "Todas as acoes" },
  { value: "auth.login_succeeded", label: "Login realizado" },
  { value: "auth.login_failed", label: "Tentativa de login falhou" },
  { value: "auth.login_blocked", label: "Login bloqueado" },
  { value: "auth.password_recovery_requested", label: "Recuperacao de senha" },
  { value: "user.created", label: "Usuario cadastrado" },
  { value: "user.updated", label: "Usuario alterado" },
  { value: "user.password_reset", label: "Senha redefinida" },
  { value: "family.created", label: "Familia cadastrada" },
  { value: "family.updated", label: "Familia alterada" },
  { value: "family.status_updated", label: "Status da familia alterado" },
  { value: "stock.batch.created", label: "Lote de alimento registrado" },
  { value: "stock.movement.created", label: "Movimento de estoque registrado" },
  { value: "basket_type.created", label: "Tipo de cesta cadastrado" },
  { value: "delivery.schedule.created", label: "Agendamento criado" },
  { value: "delivery.created", label: "Entrega concluida" },
];

const areaOptions = [
  { value: "", label: "Todas as areas" },
  { value: "user", label: "Usuarios" },
  { value: "family", label: "Familias" },
  { value: "person", label: "Pessoas da familia" },
  { value: "benefit", label: "Beneficios" },
  { value: "social_assessment", label: "Analise social" },
  { value: "item", label: "Itens" },
  { value: "item_category", label: "Categorias" },
  { value: "stock_batch", label: "Lotes de estoque" },
  { value: "stock_movement", label: "Movimentos de estoque" },
  { value: "basket_type", label: "Cestas" },
  { value: "basket_type_item", label: "Receita da cesta" },
  { value: "delivery_schedule", label: "Agendamentos" },
  { value: "delivery", label: "Entregas" },
];

const eventLabels: Record<string, string> = {
  "auth.login_succeeded": "Login realizado",
  "auth.login_failed": "Tentativa de login falhou",
  "auth.login_blocked": "Login bloqueado por seguranca",
  "auth.password_recovery_requested": "Recuperacao de senha solicitada",
  "user.created": "Usuario cadastrado",
  "user.updated": "Usuario alterado",
  "user.password_reset": "Senha redefinida",
  "family.created": "Familia cadastrada",
  "family.updated": "Familia alterada",
  "family.status_updated": "Status da familia alterado",
  "family.person.created": "Pessoa adicionada a familia",
  "family.person.updated": "Pessoa da familia alterada",
  "family.person.deleted": "Pessoa removida da familia",
  "family.benefit.created": "Beneficio registrado",
  "family.benefit.updated": "Beneficio alterado",
  "family.benefit.deleted": "Beneficio removido",
  "social_assessment.created": "Analise social registrada",
  "item.created": "Item cadastrado",
  "item.updated": "Item alterado",
  "item_category.created": "Categoria cadastrada",
  "item_category.updated": "Categoria alterada",
  "stock.batch.created": "Entrada de alimento registrada",
  "stock.movement.created": "Movimento de estoque registrado",
  "basket_type.created": "Tipo de cesta cadastrado",
  "basket_type.updated": "Tipo de cesta alterado",
  "basket_type.recipe_item.created": "Item incluido na cesta",
  "basket_type.recipe_item.updated": "Item da cesta alterado",
  "basket_type.recipe_item.deleted": "Item removido da cesta",
  "delivery.schedule.created": "Agendamento de retirada criado",
  "delivery.schedule.updated": "Agendamento de retirada alterado",
  "delivery.created": "Entrega concluida",
};

const entityLabels: Record<string, string> = {
  user: "Usuarios",
  family: "Familias",
  person: "Familias",
  benefit: "Familias",
  social_assessment: "Familias",
  item: "Estoque",
  item_category: "Estoque",
  stock_batch: "Estoque",
  stock_movement: "Estoque",
  basket_type: "Cestas",
  basket_type_item: "Cestas",
  delivery_schedule: "Entregas",
  delivery: "Entregas",
};

const detailLabels: Record<string, string> = {
  roles: "Perfis",
  login_name: "Login",
  email: "Email",
  name: "Nome",
  status: "Status",
  from_status: "Status anterior",
  to_status: "Novo status",
  recovery_channel: "Canal de recuperacao",
  reason: "Motivo",
  family_id: "Familia",
  item_id: "Item",
  item_name: "Item",
  basket_type_id: "Tipo de cesta",
  delivery_schedule_id: "Agendamento",
  quantity: "Quantidade",
  source_type: "Origem",
  notes: "Observacoes",
};

function formatRole(role: string): string {
  if (role === "admin") {
    return "Administrador";
  }

  if (role === "lider_social") {
    return "Lideranca social";
  }

  if (role === "operador") {
    return "Operador";
  }

  return role;
}

function humanizeTechnicalName(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll(".", " / ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatEntity(log: AuditLogItemResponse): string {
  if (!log.entity_type) {
    return "Sistema";
  }

  const label = entityLabels[log.entity_type] ?? humanizeTechnicalName(log.entity_type);
  return log.entity_id ? `${label} #${log.entity_id}` : label;
}

function getAuditMeta(log: AuditLogItemResponse): AuditMeta {
  const eventType = log.event_type;
  const eventPrefix = eventType.split(".")[0] ?? "";
  const action = eventLabels[eventType] ?? humanizeTechnicalName(eventType);

  if (eventType.includes("failed")) {
    return {
      action,
      area: "Seguranca",
      areaBadge: "Seguranca",
      result: "Atencao",
      tone: "warning",
    };
  }

  if (eventType.includes("blocked")) {
    return {
      action,
      area: "Seguranca",
      areaBadge: "Seguranca",
      result: "Falha",
      tone: "danger",
    };
  }

  if (eventPrefix === "auth") {
    return {
      action,
      area: "Login",
      areaBadge: "Login",
      result: eventType.includes("succeeded") ? "Sucesso" : "Atencao",
      tone: eventType.includes("succeeded") ? "success" : "warning",
    };
  }

  if (eventType.includes("password_reset") || eventType.includes("deleted")) {
    return {
      action,
      area: entityLabels[log.entity_type ?? ""] ?? "Sistema",
      areaBadge: "Alteracao sensivel",
      result: "Sensivel",
      tone: "warning",
    };
  }

  if (eventType.includes("created") || eventType.includes("updated")) {
    return {
      action,
      area: entityLabels[log.entity_type ?? ""] ?? "Sistema",
      areaBadge: entityLabels[log.entity_type ?? ""] ?? "Sistema",
      result: "Alteracao",
      tone: "change",
    };
  }

  return {
    action,
    area: entityLabels[log.entity_type ?? ""] ?? "Sistema",
    areaBadge: entityLabels[log.entity_type ?? ""] ?? "Sistema",
    result: "Registro",
    tone: "neutral",
  };
}

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Nao informado";
  }

  if (key === "roles" && Array.isArray(value)) {
    return value.map((role) => formatRole(String(role))).join(", ");
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Nao";
  }

  return String(value);
}

function getDetailItems(details: Record<string, unknown> | null) {
  if (!details || Object.keys(details).length === 0) {
    return [{ label: "Resumo", value: "Sem detalhes adicionais" }];
  }

  return Object.entries(details).map(([key, value]) => ({
    label: detailLabels[key] ?? humanizeTechnicalName(key),
    value: formatDetailValue(key, value),
  }));
}

function getDetailSummary(details: Record<string, unknown> | null): string {
  const items = getDetailItems(details).filter((item) => item.value !== "Nao informado");

  if (items.length === 0 || items[0].label === "Resumo") {
    return "Sem detalhes adicionais";
  }

  return items
    .slice(0, 2)
    .map((item) => `${item.label}: ${item.value}`)
    .join(" | ");
}

function buildAuditParams(filters: AuditFilters, limit: number, offset: number) {
  return {
    limit,
    offset,
    event_type: filters.event_type || undefined,
    actor_email: filters.actor_email || undefined,
    entity_type: filters.entity_type || undefined,
    created_from: filters.created_from
      ? `${filters.created_from}T00:00:00`
      : undefined,
    created_to: filters.created_to ? `${filters.created_to}T23:59:59` : undefined,
  };
}

function AuditDetailsDialog({
  log,
  onClose,
}: {
  log: AuditLogItemResponse;
  onClose: () => void;
}) {
  const meta = getAuditMeta(log);
  const detailItems = getDetailItems(log.details);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="audit-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="audit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="audit-dialog__header">
          <div>
            <p className="eyebrow">Detalhes da auditoria</p>
            <h3 id="audit-detail-title">{meta.action}</h3>
          </div>

          <button
            type="button"
            className="button button--secondary button--small"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className="audit-dialog__summary">
          <span className={`audit-badge audit-badge--${meta.tone}`}>
            {meta.areaBadge}
          </span>
          <span className={`audit-status audit-status--${meta.tone}`}>
            {meta.result}
          </span>
        </div>

        <dl className="audit-detail-grid">
          <div>
            <dt>Data e hora</dt>
            <dd>{formatDateTime(log.created_at)}</dd>
          </div>
          <div>
            <dt>Usuario</dt>
            <dd>{log.actor_email ?? "Sistema"}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>{formatEntity(log)}</dd>
          </div>
          <div>
            <dt>Request ID</dt>
            <dd title={log.request_id ?? undefined}>{log.request_id ?? "Nao informado"}</dd>
          </div>
          <div>
            <dt>IP</dt>
            <dd>{log.ip_address ?? "Nao informado"}</dd>
          </div>
          <div>
            <dt>Codigo tecnico</dt>
            <dd>{log.event_type}</dd>
          </div>
        </dl>

        <div className="audit-dialog__section">
          <h4>Dados da acao</h4>
          <dl className="audit-detail-list">
            {detailItems.map((item) => (
              <div key={`${item.label}-${item.value}`}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="audit-dialog__section">
          <h4>Detalhes tecnicos originais</h4>
          <pre className="technical-block">
            {JSON.stringify(
              {
                event_type: log.event_type,
                entity_type: log.entity_type,
                entity_id: log.entity_id,
                request_id: log.request_id,
                ip_address: log.ip_address,
                details: log.details,
              },
              null,
              2
            )}
          </pre>
        </div>
      </section>
    </div>
  );
}

export function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const [logs, setLogs] = useState<AuditLogItemResponse[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogItemResponse | null>(null);
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
        params: buildAuditParams(activeFilters, limit, nextOffset),
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

  const summary = useMemo(() => {
    const today = new Date().toDateString();
    const accessToday = logs.filter(
      (log) =>
        log.event_type === "auth.login_succeeded" &&
        new Date(log.created_at).toDateString() === today
    ).length;
    const failures = logs.filter(
      (log) => log.event_type.includes("failed") || log.event_type.includes("blocked")
    ).length;
    const changes = logs.filter((log) => getAuditMeta(log).tone === "change").length;
    const adminActions = logs.filter((log) => log.event_type.startsWith("user.")).length;

    return {
      accessToday,
      failures,
      changes,
      adminActions,
    };
  }, [logs]);

  async function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadAuditLogs(0);
  }

  function handleClearFilters() {
    setFilters(initialFilters);
    void loadAuditLogs(0, initialFilters);
  }

  async function handleExportCsv() {
    try {
      setIsExporting(true);
      setError("");

      const response = await api.get<Blob>("/audit-logs/export", {
        params: buildAuditParams(filters, 5000, 0),
        responseType: "blob",
      });

      const downloadUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "relatorio-auditoria-cesta-digital.csv";
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel exportar a auditoria."));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="page-stack audit-page">
      <PageHeader
        eyebrow="Administracao"
        title="Auditoria do sistema"
        description="Acompanhe acessos, alteracoes e acoes importantes realizadas no Cesta Digital."
        meta={
          <div className="audit-summary-grid" aria-label="Resumo da auditoria carregada">
            <div className="audit-summary-card">
              <span>Registros filtrados</span>
              <strong>{total}</strong>
            </div>
            <div className="audit-summary-card">
              <span>Acessos hoje</span>
              <strong>{summary.accessToday}</strong>
            </div>
            <div className="audit-summary-card">
              <span>Tentativas com falha</span>
              <strong>{summary.failures}</strong>
            </div>
            <div className="audit-summary-card">
              <span>Acoes administrativas</span>
              <strong>{summary.adminActions + summary.changes}</strong>
            </div>
          </div>
        }
      />

      <form onSubmit={handleApplyFilters} className="panel-card form-panel audit-filter-panel">
        <PanelHeader eyebrow="Filtros" title="Encontrar registros" />

        <div className="form-grid audit-filter-grid">
          <label className="form__group">
            <span>Buscar por usuario</span>
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
              placeholder="email do usuario"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <label className="form__group">
            <span>Tipo de acao</span>
            <select
              name="event_type"
              value={filters.event_type}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  event_type: event.target.value,
                }))
              }
            >
              {actionOptions.map((option) => (
                <option key={option.value || "all-actions"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form__group">
            <span>Area do sistema</span>
            <select
              name="entity_type"
              value={filters.entity_type}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  entity_type: event.target.value,
                }))
              }
            >
              {areaOptions.map((option) => (
                <option key={option.value || "all-areas"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form__group">
            <span>De</span>
            <input
              type="date"
              name="created_from"
              value={filters.created_from}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  created_from: event.target.value,
                }))
              }
            />
          </label>

          <label className="form__group">
            <span>Ate</span>
            <input
              type="date"
              name="created_to"
              value={filters.created_to}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  created_to: event.target.value,
                }))
              }
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

      <section className="panel-card audit-panel">
        <PanelHeader
          eyebrow="Historico"
          title="Eventos recentes"
          actions={
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => void handleExportCsv()}
              disabled={isExporting}
            >
              {isExporting ? "Exportando..." : "Exportar relatorio CSV"}
            </button>
          }
        />

        {error ? (
          <StateMessage variant="error">{error}</StateMessage>
        ) : null}

        {isLoading ? (
          <StateMessage variant="loading">
            Carregando auditoria do sistema...
          </StateMessage>
        ) : logs.length === 0 ? (
          <StateMessage>
            Nenhum registro encontrado para os filtros atuais.
          </StateMessage>
        ) : (
          <>
            <DataTable caption="Eventos recentes da auditoria do sistema">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Acao</th>
                  <th>Usuario</th>
                  <th>Area</th>
                  <th>Resultado</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = getAuditMeta(log);
                  return (
                    <tr key={log.id}>
                      <td className="table-cell--nowrap">{formatDateTime(log.created_at)}</td>
                      <td>
                        <div className="audit-action-cell">
                          <strong title={log.event_type}>{meta.action}</strong>
                        </div>
                      </td>
                      <td className="table-cell--truncate" title={log.actor_email ?? undefined}>
                        {log.actor_email ?? "Sistema"}
                      </td>
                      <td>
                        <span className={`audit-badge audit-badge--${meta.tone}`}>
                          {meta.areaBadge}
                        </span>
                      </td>
                      <td>
                        <span className={`audit-status audit-status--${meta.tone}`}>
                          {meta.result}
                        </span>
                      </td>
                      <td>
                        <div className="audit-details-cell">
                          <span title={getDetailSummary(log.details)}>
                            {getDetailSummary(log.details)}
                          </span>
                          <button
                            type="button"
                            className="button button--secondary button--small"
                            onClick={() => setSelectedLog(log)}
                          >
                            Ver detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>

            <div className="audit-mobile-list" aria-label="Eventos recentes da auditoria">
              {logs.map((log) => {
                const meta = getAuditMeta(log);
                return (
                  <article className="audit-event-card" key={`mobile-${log.id}`}>
                    <div className="audit-event-card__header">
                      <strong>{meta.action}</strong>
                      <span className={`audit-status audit-status--${meta.tone}`}>
                        {meta.result}
                      </span>
                    </div>
                    <p>por {log.actor_email ?? "Sistema"}</p>
                    <p>{formatDateTime(log.created_at)}</p>
                    <div className="audit-event-card__footer">
                      <span className={`audit-badge audit-badge--${meta.tone}`}>
                        {meta.areaBadge}
                      </span>
                      <button
                        type="button"
                        className="button button--secondary button--small"
                        onClick={() => setSelectedLog(log)}
                      >
                        Ver detalhes
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <PaginationControls
              total={total}
              offset={offset}
              limit={limit}
              isLoading={isLoading}
              onPageChange={(nextOffset) => void loadAuditLogs(nextOffset)}
            />
          </>
        )}
      </section>

      {selectedLog ? (
        <AuditDetailsDialog log={selectedLog} onClose={() => setSelectedLog(null)} />
      ) : null}
    </div>
  );
}
