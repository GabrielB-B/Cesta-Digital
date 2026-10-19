import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Circle,
  ClipboardCheck,
  PackagePlus,
  RefreshCw,
  ShoppingBasket,
  TriangleAlert,
  Truck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../contexts/useAuth";
import { ROUTE_ACCESS, userHasAnyRole } from "../routes/routeAccess";
import type { DashboardOverviewResponse } from "../types/dashboard";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateOnly } from "../utils/format";
import styles from "./DashboardPage.module.css";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  weekday: "long",
});

function getFirstName(name?: string | null): string {
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName || "equipe";
}

function getFamilyStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    apta_recorrente: "Apta recorrente",
    apta_emergencial: "Apta emergencial",
    em_analise: "Em análise",
    inapta: "Inapta",
    inativa: "Inativa",
  };

  return labels[status] ?? status.replaceAll("_", " ");
}

type PriorityTone = "assessment" | "delivery" | "basket" | "family";

interface PriorityItem {
  id: string;
  title: string;
  description: string;
  label: string;
  tone: PriorityTone;
  to: string;
}

interface QuickAction {
  to: string;
  label: string;
  icon: typeof PackagePlus;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await api.get<DashboardOverviewResponse>(
        "/dashboard/overview",
      );
      setData(response.data);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Não foi possível carregar os indicadores do início.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError("");
        const response = await api.get<DashboardOverviewResponse>(
          "/dashboard/overview",
        );

        if (isMounted) setData(response.data);
      } catch (requestError) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              requestError,
              "Não foi possível carregar os indicadores do início.",
            ),
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const canAccessFamilies = userHasAnyRole(
    user?.roles ?? [],
    ROUTE_ACCESS.familyRecords,
  );
  const canAccessAssessments = userHasAnyRole(
    user?.roles ?? [],
    ROUTE_ACCESS.socialAssessments,
  );
  const canAccessInventory = userHasAnyRole(
    user?.roles ?? [],
    ROUTE_ACCESS.inventory,
  );
  const canConfigureBaskets = userHasAnyRole(
    user?.roles ?? [],
    ROUTE_ACCESS.inventoryConfiguration,
  );
  const canAccessDeliveries = userHasAnyRole(
    user?.roles ?? [],
    ROUTE_ACCESS.deliveries,
  );

  const priorities = useMemo<PriorityItem[]>(() => {
    if (!data) return [];

    const items: PriorityItem[] = [];
    const nextRevaluation = data.upcoming_revaluations[0];

    if (canAccessAssessments) {
      items.push({
        id: "revaluations",
        title:
          data.upcoming_revaluations_count > 0
            ? `Reavaliar ${numberFormatter.format(data.upcoming_revaluations_count)} famílias`
            : "Reavaliações em dia",
        description: nextRevaluation
          ? `Próximo prazo em ${formatDateOnly(nextRevaluation.next_revaluation_date)} · ${getFamilyStatusLabel(nextRevaluation.status)}`
          : "Nenhuma aptidão precisa ser recalculada agora.",
        label: "Aptidão",
        tone: "assessment",
        to: "/assessments",
      });

      items.push({
        id: "under-review",
        title:
          data.under_review_families > 0
            ? `Revisar ${numberFormatter.format(data.under_review_families)} famílias em análise`
            : "Análises sociais em dia",
        description: "A decisão final considera o cálculo e o parecer social.",
        label: "Famílias",
        tone: "family",
        to: "/families?status=em_analise",
      });
    }

    if (canAccessDeliveries) {
      items.push({
        id: "deliveries",
        title:
          data.pending_schedules > 0
            ? `Acompanhar ${numberFormatter.format(data.pending_schedules)} retiradas pendentes`
            : "Agenda de retiradas em dia",
        description: `${numberFormatter.format(data.deliveries_this_month)} entregas concluídas neste mês.`,
        label: "Entregas",
        tone: "delivery",
        to: "/deliveries",
      });

    }

    if (canConfigureBaskets) {
      const leadingBasket = data.basket_summaries[0];
      if (leadingBasket) {
        items.push({
          id: `basket-${leadingBasket.basket_type_id}`,
          title: `${numberFormatter.format(leadingBasket.possible_baskets)} unidades de ${leadingBasket.basket_type_name} disponíveis`,
          description: "Quantidade possível com o saldo utilizável atual.",
          label: "Cestas",
          tone: "basket",
          to: `/basket-types/${leadingBasket.basket_type_id}`,
        });
      }
    }

    return items.slice(0, 4);
  }, [canAccessAssessments, canAccessDeliveries, canConfigureBaskets, data]);

  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [];

    if (canAccessInventory) {
      actions.push({
        to: "/stock-batches/new",
        label: "Nova entrada",
        icon: PackagePlus,
      });
    }

    if (canAccessFamilies) {
      actions.push({
        to: "/families/new",
        label: "Nova família",
        icon: UserPlus,
      });
    }

    if (canAccessDeliveries) {
      actions.push({
        to: "/deliveries/schedules/new",
        label: "Agendar entrega",
        icon: CalendarPlus,
      });
    }

    if (canConfigureBaskets) {
      actions.push({
        to: "/basket-types",
        label: "Tipos de cesta",
        icon: ShoppingBasket,
      });
    }

    return actions.slice(0, 4);
  }, [canAccessDeliveries, canAccessFamilies, canAccessInventory, canConfigureBaskets]);

  if (isLoading) {
    return (
      <div className={styles.page} aria-busy="true" aria-live="polite">
        <header className={styles.pageHeader}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonSubtitle} />
          <span className={styles.srOnly}>Carregando resumo operacional…</span>
        </header>
        <div className={styles.metricGrid} aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <section className={styles.errorState} role="alert">
          <span className={`${styles.errorIcon} ${styles.iconCircle}`}>
            <TriangleAlert aria-hidden="true" />
          </span>
          <div>
            <h1>Não foi possível carregar o início</h1>
            <p>{error || "O resumo operacional está indisponível."}</p>
          </div>
          <button className={styles.retryButton} type="button" onClick={loadDashboard}>
            <RefreshCw size={17} aria-hidden="true" />
            Tentar novamente
          </button>
        </section>
      </div>
    );
  }

  const metrics = [
    {
      id: "active-families",
      title: "Famílias ativas",
      value: data.active_families,
      detail: `${numberFormatter.format(data.total_families)} cadastradas no total`,
      icon: UsersRound,
      tone: "family",
      to: canAccessFamilies ? "/families" : undefined,
    },
    {
      id: "deliveries-month",
      title: "Entregas no mês",
      value: data.deliveries_this_month,
      detail: "Baixas concluídas no período",
      icon: Truck,
      tone: "delivery",
      to: canAccessDeliveries ? "/deliveries" : undefined,
    },
    {
      id: "pending-schedules",
      title: "Retiradas pendentes",
      value: data.pending_schedules,
      detail: data.pending_schedules === 1 ? "1 agendamento aberto" : "Agendamentos em aberto",
      icon: CalendarDays,
      tone: "schedule",
      to: canAccessDeliveries ? "/deliveries" : undefined,
    },
    {
      id: "stock-alerts",
      title: "Itens em alerta",
      value: data.items_below_minimum_count,
      detail:
        data.items_below_minimum_count > 0
          ? "Abaixo do estoque mínimo"
          : "Estoque dentro dos limites",
      icon: TriangleAlert,
      tone: "attention",
      to: canAccessInventory ? "/items" : undefined,
    },
  ] as const;

  const accountedFamilies =
    data.recurring_eligible_families +
    data.emergency_eligible_families +
    data.under_review_families +
    data.inactive_families;
  const familyDistribution = [
    {
      label: "Aptas recorrentes",
      value: data.recurring_eligible_families,
      tone: "recurring",
    },
    {
      label: "Aptas emergenciais",
      value: data.emergency_eligible_families,
      tone: "emergency",
    },
    {
      label: "Em análise",
      value: data.under_review_families,
      tone: "review",
    },
    {
      label: "Inativas",
      value: data.inactive_families,
      tone: "inactive",
    },
    {
      label: "Outras situações",
      value: Math.max(0, data.total_families - accountedFamilies),
      tone: "other",
    },
  ].filter((entry) => entry.value > 0);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Painel operacional</span>
          <h1>
            Olá, {getFirstName(user?.name)} <span aria-hidden="true">👋</span>
          </h1>
        </div>
        <div className={styles.headerContext} aria-label={`Visão de ${dateFormatter.format(new Date())}`}>
          <span aria-hidden="true" />
          <div>
            <small>Visão atual</small>
            <strong>{dateFormatter.format(new Date())}</strong>
          </div>
        </div>
      </header>

      <section className={styles.metricGrid} aria-label="Indicadores principais">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const content = (
            <>
              <span className={`${styles.metricIcon} ${styles[`${metric.tone}Icon`]}`}>
                <Icon aria-hidden="true" />
              </span>
              <span className={styles.metricContent}>
                <span className={styles.metricTitle}>{metric.title}</span>
                <strong>{numberFormatter.format(metric.value)}</strong>
                <span className={styles.metricDetail}>{metric.detail}</span>
              </span>
            </>
          );

          return metric.to ? (
            <Link
              key={metric.id}
              to={metric.to}
              className={`${styles.metricCard} ${styles[`${metric.tone}Card`]}`}
              data-testid={`dashboard-metric-${metric.id}`}
            >
              {content}
            </Link>
          ) : (
            <div
              key={metric.id}
              className={`${styles.metricCard} ${styles[`${metric.tone}Card`]}`}
              data-testid={`dashboard-metric-${metric.id}`}
            >
              {content}
            </div>
          );
        })}
      </section>

      <section className={styles.operationalGrid} aria-label="Prioridades operacionais">
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Prioridades de hoje</h2>
              <p>O que precisa de atenção primeiro.</p>
            </div>
            <ClipboardCheck aria-hidden="true" />
          </div>

          {priorities.length > 0 ? (
            <div className={styles.priorityList}>
              {priorities.map((priority) => (
                <Link key={priority.id} to={priority.to} className={styles.priorityItem}>
                  <Circle className={styles.priorityMarker} aria-hidden="true" />
                  <span className={styles.priorityCopy}>
                    <strong>{priority.title}</strong>
                    <span>{priority.description}</span>
                  </span>
                  <span
                    className={`${styles.priorityBadge} ${styles[`${priority.tone}Badge`]}`}
                  >
                    {priority.label}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>Nenhuma prioridade pendente para seu perfil.</p>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Alertas de estoque</h2>
              <p>Itens abaixo do mínimo cadastrado.</p>
            </div>
            <TriangleAlert aria-hidden="true" />
          </div>

          {data.stock_alerts.length > 0 ? (
            <div className={styles.alertList}>
              {data.stock_alerts.slice(0, 4).map((alert) => (
                <div key={alert.item_id} className={styles.alertItem}>
                  <span className={styles.alertDot} aria-hidden="true" />
                  <span className={styles.alertCopy}>
                    <strong>{alert.item_name}</strong>
                    <span>{alert.category_name}</span>
                  </span>
                  <span className={styles.alertStatus}>Estoque baixo</span>
                  <strong className={styles.alertQuantity}>
                    {numberFormatter.format(alert.total_quantity)} / mín. {numberFormatter.format(alert.minimum_stock_alert)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>Nenhum item abaixo do estoque mínimo.</p>
          )}

          {canAccessInventory ? (
            <Link className={styles.panelLink} to="/items">
              Ver todos os alertas
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : null}
        </article>
      </section>

      <div className={styles.dashboardFooterGrid}>
        {canAccessFamilies ? (
          <section className={styles.distributionPanel} aria-labelledby="family-distribution-title">
            <div className={styles.quickHeader}>
              <div>
                <h2 id="family-distribution-title">Situação das famílias</h2>
                <p>Distribuição dos {numberFormatter.format(data.total_families)} cadastros.</p>
              </div>
              <Link className={styles.panelLinkCompact} to="/families">
                Ver famílias
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            {familyDistribution.length > 0 ? (
              <>
                <div className={styles.distributionTrack} aria-hidden="true">
                  {familyDistribution.map((entry) => (
                    <span
                      key={entry.tone}
                      className={styles[`${entry.tone}Segment`]}
                      style={{ flexGrow: entry.value }}
                    />
                  ))}
                </div>
                <dl className={styles.distributionLegend}>
                  {familyDistribution.map((entry) => (
                    <div key={entry.tone}>
                      <dt><span className={styles[`${entry.tone}Dot`]} aria-hidden="true" />{entry.label}</dt>
                      <dd>{numberFormatter.format(entry.value)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className={styles.emptyState}>Nenhuma família cadastrada.</p>
            )}
          </section>
        ) : null}

        {quickActions.length > 0 ? (
          <section
            className={`${styles.quickPanel}${canAccessFamilies ? "" : ` ${styles.quickPanelWide}`}`}
            aria-labelledby="dashboard-quick-actions"
          >
            <div className={styles.quickHeader}>
              <div>
                <h2 id="dashboard-quick-actions">Ações rápidas</h2>
                <p>Atalhos para as tarefas mais frequentes.</p>
              </div>
            </div>
            <div className={styles.quickGrid}>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.to} to={action.to} className={styles.quickAction}>
                    <Icon aria-hidden="true" />
                    <span>{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
