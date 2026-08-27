import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  CheckCircle2,
  Download,
  FileClock,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { api } from "../api/client";
import { AdministrationDialog } from "../components/AdministrationDialog";
import { AdministrationShell } from "../components/AdministrationShell";
import type { AuditLogItemResponse, AuditLogListResponse } from "../types/audit";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateTime } from "../utils/format";
import styles from "./AdministrationPage.module.css";

type AuditTone = "success" | "warning" | "danger" | "change" | "neutral";
type AuditMeta = { action: string; areaBadge: string; result: string; tone: AuditTone };
type AuditFilters = {
  event_type: string;
  actor_email: string;
  entity_type: string;
  created_from: string;
  created_to: string;
};

const PAGE_SIZE = 25;
const initialFilters: AuditFilters = {
  event_type: "",
  actor_email: "",
  entity_type: "",
  created_from: "",
  created_to: "",
};

const actionOptions = [
  { value: "", label: "Todas as ações" },
  { value: "auth.login_succeeded", label: "Login realizado" },
  { value: "auth.login_failed", label: "Tentativa de login falhou" },
  { value: "auth.login_blocked", label: "Login bloqueado" },
  { value: "auth.password_recovery_requested", label: "Recuperação de senha" },
  { value: "user.created", label: "Usuário cadastrado" },
  { value: "user.updated", label: "Usuário alterado" },
  { value: "user.password_reset", label: "Senha redefinida" },
  { value: "family.created", label: "Família cadastrada" },
  { value: "family.updated", label: "Família alterada" },
  { value: "family.status_updated", label: "Status da família alterado" },
  { value: "stock.batch.created", label: "Lote de alimento registrado" },
  { value: "stock.movement.created", label: "Movimento de estoque registrado" },
  { value: "basket_type.created", label: "Tipo de cesta cadastrado" },
  { value: "delivery.schedule.created", label: "Agendamento criado" },
  { value: "delivery.created", label: "Entrega concluída" },
];

const areaOptions = [
  { value: "", label: "Todas as áreas" },
  { value: "user", label: "Usuários" },
  { value: "family", label: "Famílias" },
  { value: "person", label: "Pessoas da família" },
  { value: "benefit", label: "Benefícios" },
  { value: "social_assessment", label: "Avaliação social" },
  { value: "item", label: "Produtos" },
  { value: "item_category", label: "Categorias" },
  { value: "stock_batch", label: "Lotes de estoque" },
  { value: "stock_movement", label: "Movimentos de estoque" },
  { value: "basket_type", label: "Tipos de cesta" },
  { value: "basket_type_item", label: "Composição de cesta" },
  { value: "delivery_schedule", label: "Agendamentos" },
  { value: "delivery", label: "Entregas" },
];

const eventLabels: Record<string, string> = {
  "auth.login_succeeded": "Login realizado",
  "auth.login_failed": "Tentativa de login falhou",
  "auth.login_blocked": "Login bloqueado por segurança",
  "auth.password_recovery_requested": "Recuperação de senha solicitada",
  "user.created": "Usuário cadastrado",
  "user.updated": "Usuário alterado",
  "user.password_reset": "Senha redefinida",
  "family.created": "Família cadastrada",
  "family.updated": "Família alterada",
  "family.status_updated": "Status da família alterado",
  "family.person.created": "Pessoa adicionada à família",
  "family.person.updated": "Pessoa da família alterada",
  "family.person.deleted": "Pessoa removida da família",
  "family.benefit.created": "Benefício registrado",
  "family.benefit.updated": "Benefício alterado",
  "family.benefit.deleted": "Benefício removido",
  "social_assessment.created": "Avaliação social registrada",
  "item.created": "Produto cadastrado",
  "item.updated": "Produto alterado",
  "item_category.created": "Categoria cadastrada",
  "item_category.updated": "Categoria alterada",
  "stock.batch.created": "Entrada de alimento registrada",
  "stock.movement.created": "Movimento de estoque registrado",
  "basket_type.created": "Tipo de cesta cadastrado",
  "basket_type.updated": "Tipo de cesta alterado",
  "basket_type.recipe_item.created": "Produto incluído na cesta",
  "basket_type.recipe_item.updated": "Produto da cesta alterado",
  "basket_type.recipe_item.deleted": "Produto removido da cesta",
  "delivery.schedule.created": "Agendamento de retirada criado",
  "delivery.schedule.updated": "Agendamento de retirada alterado",
  "delivery.created": "Entrega concluída",
};

const entityLabels: Record<string, string> = {
  user: "Usuários",
  family: "Famílias",
  person: "Famílias",
  benefit: "Famílias",
  social_assessment: "Avaliações",
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
  email: "E-mail",
  name: "Nome",
  status: "Status",
  from_status: "Status anterior",
  to_status: "Novo status",
  recovery_channel: "Canal de recuperação",
  reason: "Motivo",
  family_id: "Família",
  item_id: "Produto",
  item_name: "Produto",
  basket_type_id: "Tipo de cesta",
  delivery_schedule_id: "Agendamento",
  quantity: "Quantidade",
  source_type: "Origem",
  notes: "Observações",
};

function formatRole(role: string): string {
  return { admin: "Administrador", lider_social: "Liderança social", operador: "Operador" }[role] ?? role;
}

function humanizeTechnicalName(value: string): string {
  return value.replaceAll("_", " ").replaceAll(".", " / ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatEntity(log: AuditLogItemResponse): string {
  if (!log.entity_type) return "Sistema";
  const label = entityLabels[log.entity_type] ?? humanizeTechnicalName(log.entity_type);
  return log.entity_id ? `${label} #${log.entity_id}` : label;
}

function getAuditMeta(log: AuditLogItemResponse): AuditMeta {
  const action = eventLabels[log.event_type] ?? humanizeTechnicalName(log.event_type);
  const area = entityLabels[log.entity_type ?? ""] ?? "Sistema";
  if (log.event_type.includes("blocked")) return { action, areaBadge: "Segurança", result: "Bloqueado", tone: "danger" };
  if (log.event_type.includes("failed")) return { action, areaBadge: "Segurança", result: "Atenção", tone: "warning" };
  if (log.event_type.startsWith("auth.")) {
    const success = log.event_type.includes("succeeded");
    return { action, areaBadge: "Acesso", result: success ? "Sucesso" : "Atenção", tone: success ? "success" : "warning" };
  }
  if (log.event_type.includes("password_reset") || log.event_type.includes("deleted")) return { action, areaBadge: area, result: "Sensível", tone: "warning" };
  if (log.event_type.includes("created") || log.event_type.includes("updated")) return { action, areaBadge: area, result: "Registrado", tone: "change" };
  return { action, areaBadge: area, result: "Registro", tone: "neutral" };
}

function getToneClass(tone: AuditTone): string {
  const classes: Record<AuditTone, string> = {
    success: styles.toneSuccess,
    warning: styles.toneWarning,
    danger: styles.toneDanger,
    change: styles.toneChange,
    neutral: styles.toneNeutral,
  };
  return `${styles.toneBadge} ${classes[tone]}`;
}

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Não informado";
  if (key === "roles" && Array.isArray(value)) return value.map((role) => formatRole(String(role))).join(", ");
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

function getDetailItems(details: Record<string, unknown> | null) {
  if (!details || Object.keys(details).length === 0) return [{ label: "Resumo", value: "Sem detalhes adicionais" }];
  return Object.entries(details).map(([key, value]) => ({ label: detailLabels[key] ?? humanizeTechnicalName(key), value: formatDetailValue(key, value) }));
}

function getDetailSummary(details: Record<string, unknown> | null): string {
  return getDetailItems(details).filter((item) => item.value !== "Não informado").slice(0, 2).map((item) => `${item.label}: ${item.value}`).join(" · ") || "Sem detalhes adicionais";
}

function buildAuditParams(filters: AuditFilters, offset: number) {
  return {
    limit: PAGE_SIZE,
    offset,
    event_type: filters.event_type || undefined,
    actor_email: filters.actor_email || undefined,
    entity_type: filters.entity_type || undefined,
    created_from: filters.created_from ? `${filters.created_from}T00:00:00` : undefined,
    created_to: filters.created_to ? `${filters.created_to}T23:59:59` : undefined,
  };
}

function AuditDetails({ log }: { log: AuditLogItemResponse }) {
  const meta = getAuditMeta(log);
  return (
    <>
      <div className={styles.badgeList}><span className={getToneClass(meta.tone)}>{meta.areaBadge}</span><span className={getToneClass(meta.tone)}>{meta.result}</span></div>
      <dl className={styles.detailGrid}>
        <div><dt>Data e hora</dt><dd>{formatDateTime(log.created_at)}</dd></div>
        <div><dt>Usuário</dt><dd>{log.actor_email ?? "Sistema"}</dd></div>
        <div><dt>Área e registro</dt><dd>{formatEntity(log)}</dd></div>
        <div><dt>Endereço IP</dt><dd>{log.ip_address ?? "Não informado"}</dd></div>
        <div><dt>Identificador da requisição</dt><dd>{log.request_id ?? "Não informado"}</dd></div>
        <div><dt>Código do evento</dt><dd>{log.event_type}</dd></div>
      </dl>
      <section className={styles.permissionBlock}>
        <div><h3>Dados registrados</h3><p>Informações funcionais associadas a esta ação.</p></div>
        <dl className={styles.detailList}>{getDetailItems(log.details).map((item) => <div key={`${item.label}-${item.value}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
      </section>
      <details className={styles.technicalDetails}>
        <summary>Ver registro técnico original</summary>
        <pre className={styles.technicalBlock}>{JSON.stringify({ event_type: log.event_type, entity_type: log.entity_type, entity_id: log.entity_id, request_id: log.request_id, ip_address: log.ip_address, details: log.details }, null, 2)}</pre>
      </details>
    </>
  );
}

export function AuditLogsPage() {
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(initialFilters);
  const [activeFilters, setActiveFilters] = useState<AuditFilters>(initialFilters);
  const [logs, setLogs] = useState<AuditLogItemResponse[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogItemResponse | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const loadAuditLogs = useCallback(async (filters: AuditFilters, nextOffset: number) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await api.get<AuditLogListResponse>("/audit-logs", { params: buildAuditParams(filters, nextOffset) });
      setLogs(response.data.items);
      setTotal(response.data.total);
      setOffset(nextOffset);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Não foi possível carregar a auditoria."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    void api
      .get<AuditLogListResponse>("/audit-logs", { params: buildAuditParams(initialFilters, 0) })
      .then((response) => {
        if (!isCurrent) return;
        setLogs(response.data.items);
        setTotal(response.data.total);
      })
      .catch((loadError) => {
        if (isCurrent) {
          setError(getApiErrorMessage(loadError, "Não foi possível carregar a auditoria."));
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const summary = useMemo(() => ({
    access: logs.filter((log) => log.event_type === "auth.login_succeeded").length,
    attention: logs.filter((log) => ["warning", "danger"].includes(getAuditMeta(log).tone)).length,
    changes: logs.filter((log) => getAuditMeta(log).tone === "change").length,
  }), [logs]);

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveFilters(draftFilters);
    void loadAuditLogs(draftFilters, 0);
  }

  function handleClearFilters() {
    setDraftFilters(initialFilters);
    setActiveFilters(initialFilters);
    void loadAuditLogs(initialFilters, 0);
  }

  async function handleExportCsv() {
    setIsExporting(true);
    setError("");
    try {
      const response = await api.get<Blob>("/audit-logs/export", { params: { ...buildAuditParams(activeFilters, 0), limit: 5000 }, responseType: "blob" });
      const downloadUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "relatorio-auditoria-cesta-digital.csv";
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (exportError) {
      setError(getApiErrorMessage(exportError, "Não foi possível exportar a auditoria."));
    } finally {
      setIsExporting(false);
    }
  }

  const closeDetails = useCallback(() => setSelectedLog(null), []);
  const auditAside = (
    <>
      <h2 className={styles.summaryTitle}>Resumo da consulta</h2>
      <div className={styles.brandSummary}>
        <span className={styles.summaryIcon}><FileClock aria-hidden="true" /></span>
        <div><strong>{total} eventos</strong><span>Rastreabilidade ativa</span></div>
      </div>
      <div className={styles.summaryStats} aria-label="Indicadores da página carregada">
        <div className={styles.summaryStat}><span>Acessos</span><strong>{summary.access}</strong></div>
        <div className={styles.summaryStat}><span>Alterações</span><strong>{summary.changes}</strong></div>
        <div className={styles.summaryStat}><span>Atenções</span><strong>{summary.attention}</strong></div>
        <div className={styles.summaryStat}><span>Nesta página</span><strong>{logs.length}</strong></div>
      </div>
      <section className={styles.summarySection}>
        <h3>Integridade operacional</h3>
        <ul className={styles.summaryList}>
          <li><ShieldCheck aria-hidden="true" /><span>Eventos são somente leitura nesta área.</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span>Filtros e exportação respeitam o acesso administrativo.</span></li>
          <li><ShieldAlert aria-hidden="true" /><span>Ações sensíveis permanecem identificadas para revisão.</span></li>
        </ul>
      </section>
    </>
  );

  return (
    <AdministrationShell activeSection="audit" aside={auditAside}>
      <header className={styles.panelHeader}>
        <div><h2>Auditoria do sistema</h2><p>Acompanhe acessos, alterações e ações importantes realizadas no sistema.</p></div>
        <button type="button" className={styles.secondaryButton} onClick={() => void handleExportCsv()} disabled={isExporting}><Download aria-hidden="true" /> {isExporting ? "Exportando..." : "Exportar CSV"}</button>
      </header>

      <form className={styles.auditForm} onSubmit={handleApplyFilters}>
        <div className={styles.auditFilters}>
          <label className={styles.searchControl}><Search aria-hidden="true" /><span className="sr-only">Buscar por e-mail do usuário</span><input type="email" value={draftFilters.actor_email} onChange={(event) => setDraftFilters((current) => ({ ...current, actor_email: event.target.value }))} placeholder="Buscar por usuário..." autoComplete="off" /></label>
          <label><span className="sr-only">Tipo de ação</span><select className={styles.selectControl} value={draftFilters.event_type} onChange={(event) => setDraftFilters((current) => ({ ...current, event_type: event.target.value }))}>{actionOptions.map((option) => <option key={option.value || "all-actions"} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className="sr-only">Área do sistema</span><select className={styles.selectControl} value={draftFilters.entity_type} onChange={(event) => setDraftFilters((current) => ({ ...current, entity_type: event.target.value }))}>{areaOptions.map((option) => <option key={option.value || "all-areas"} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        <div className={styles.auditDates}>
          <label className={styles.field}>Data inicial<input type="date" value={draftFilters.created_from} onChange={(event) => setDraftFilters((current) => ({ ...current, created_from: event.target.value }))} /></label>
          <label className={styles.field}>Data final<input type="date" value={draftFilters.created_to} onChange={(event) => setDraftFilters((current) => ({ ...current, created_to: event.target.value }))} /></label>
        </div>
        <div className={styles.filterActions}><button type="button" className={styles.textButton} onClick={handleClearFilters}>Limpar filtros</button><button type="submit" className={styles.primaryButton} disabled={isLoading}>{isLoading ? "Consultando..." : "Aplicar filtros"}</button></div>
      </form>

      {error ? <div className={styles.errorState} role="alert">{error}</div> : null}
      {isLoading ? <div className={styles.loadingState} role="status">Carregando auditoria do sistema...</div> : logs.length === 0 ? <div className={styles.emptyState}>Nenhum registro encontrado para os filtros atuais.</div> : (
        <div className={styles.tableShell}>
          <div className={styles.tableScroll}>
            <table className={`${styles.table} ${styles.auditTable}`}>
              <caption className="sr-only">Eventos recentes da auditoria do sistema</caption>
              <thead><tr><th>Quando</th><th>Ação</th><th>Usuário</th><th>Área</th><th>Resultado</th><th>Detalhes</th></tr></thead>
              <tbody>{logs.map((log) => {
                const meta = getAuditMeta(log);
                return <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td><div className={styles.auditAction}><strong>{meta.action}</strong><span>{formatEntity(log)}</span></div></td>
                  <td className={styles.truncate} title={log.actor_email ?? undefined}>{log.actor_email ?? "Sistema"}</td>
                  <td><span className={getToneClass(meta.tone)}>{meta.areaBadge}</span></td>
                  <td><span className={getToneClass(meta.tone)}>{meta.result}</span></td>
                  <td><button type="button" className={styles.detailsButton} onClick={() => setSelectedLog(log)}>Ver detalhes</button></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <div className={styles.mobileList} aria-label="Eventos recentes da auditoria">{logs.map((log) => {
            const meta = getAuditMeta(log);
            return <article className={styles.mobileCard} key={`mobile-${log.id}`}>
              <div className={styles.mobileCardHeader}><strong>{meta.action}</strong><span className={getToneClass(meta.tone)}>{meta.result}</span></div>
              <dl className={styles.mobileCardMeta}><div><dt>Usuário</dt><dd>{log.actor_email ?? "Sistema"}</dd></div><div><dt>Quando</dt><dd>{formatDateTime(log.created_at)}</dd></div><div><dt>Área</dt><dd>{meta.areaBadge}</dd></div><div><dt>Resumo</dt><dd>{getDetailSummary(log.details)}</dd></div></dl>
              <div className={styles.mobileCardFooter}><span className={getToneClass(meta.tone)}>{meta.areaBadge}</span><button type="button" className={styles.secondaryButton} onClick={() => setSelectedLog(log)}>Ver detalhes</button></div>
            </article>;
          })}</div>
          <div className={styles.pagination}><span>Mostrando {offset + 1} a {Math.min(offset + logs.length, total)} de {total} eventos</span><div className={styles.paginationActions}><button type="button" className={styles.paginationButton} disabled={offset === 0 || isLoading} onClick={() => void loadAuditLogs(activeFilters, Math.max(0, offset - PAGE_SIZE))}>Anterior</button><button type="button" className={styles.paginationButton} disabled={offset + PAGE_SIZE >= total || isLoading} onClick={() => void loadAuditLogs(activeFilters, offset + PAGE_SIZE)}>Próxima</button></div></div>
        </div>
      )}

      {selectedLog ? <AdministrationDialog title={getAuditMeta(selectedLog).action} description="Detalhes funcionais e técnicos do evento selecionado." onRequestClose={closeDetails} wide footer={<button type="button" className={styles.secondaryButton} onClick={closeDetails}>Fechar</button>}><AuditDetails log={selectedLog} /></AdministrationDialog> : null}
    </AdministrationShell>
  );
}
