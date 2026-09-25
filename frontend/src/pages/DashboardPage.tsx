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

  const canAccessSocial = userHasAnyRole(
    user?.roles ?? [],
    ROUTE_ACCESS.social,
  );
  const canAccessOperations = userHasAnyRole(
    user?.roles ?? [],
    ROUTE_ACCESS.operations,
  );

  const priorities = useMemo<PriorityItem[]>(() => {
    if (!data) return [];

    const items: PriorityItem[] = [];
    const nextRevaluation = data.upcoming_revaluations[0];

    if (canAccessSocial) {
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
        to: "/families",
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

    if (canAccessOperations) {
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
  }, [canAccessOperations, canAccessSocial, data]);

  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [];

    if (canAccessOperations) {
      actions.push({
        to: "/stock-batches/new",
        label: "Nova entrada",
        icon: PackagePlus,
      });
    }

    if (canAccessSocial) {
      actions.push({
        to: "/families/new",
        label: "Nova família",
        icon: UserPlus,
      });
    }

    if (canAccessOperations) {
      actions.push({
        to: "/deliveries/schedules/new",
        label: "Agendar entrega",
        icon: CalendarPlus,
      });
      actions.push({
        to: "/basket-types",
        label: "Tipos de cesta",
        icon: ShoppingBasket,
      });
    }

    return actions.slice(0, 4);
  }, [canAccessOperations, canAccessSocial]);

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
      to: canAccessSocial ? "/families" : undefined,
    },
    {
      id: "deliveries-month",
      title: "Entregas no mês",
      value: data.deliveries_this_month,
      detail: "Baixas concluídas no período",
      icon: Truck,
      tone: "delivery",
      to: canAccessOperations ? "/deliveries" : undefined,
    },
    {
      id: "pending-schedules",
      title: "Retiradas pendentes",
      value: data.pending_schedules,
      detail: data.pending_schedules === 1 ? "1 agendamento aberto" : "Agendamentos em aberto",
      icon: CalendarDays,
      tone: "schedule",
      to: canAccessOperations ? "/deliveries" : undefined,
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
      to: canAccessOperations ? "/items" : undefined,
    },
  ] as const;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>
          Olá, {getFirstName(user?.name)} <span aria-hidden="true">👋</span>
        </h1>
        <p>Resumo geral das operações e prioridades atuais.</p>
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
              className={styles.metricCard}
              data-testid={`dashboard-metric-${metric.id}`}
            >
              {content}
            </Link>
          ) : (
            <div
              key={metric.id}
              className={styles.metricCard}
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

          {canAccessOperations ? (
            <Link className={styles.panelLink} to="/items">
              Ver todos os alertas
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : null}
        </article>
      </section>

      {quickActions.length > 0 ? (
        <section className={styles.quickPanel} aria-labelledby="dashboard-quick-actions">
          <div className={styles.quickHeader}>
            <h2 id="dashboard-quick-actions">Ações rápidas</h2>
            <p>Atalhos para as tarefas mais frequentes.</p>
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
  );
}
