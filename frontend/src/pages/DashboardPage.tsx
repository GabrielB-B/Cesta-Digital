import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { AppIcon } from "../components/AppIcon";
import { DataTable } from "../components/DataTable";
import { MetricGrid } from "../components/MetricGrid";
import { useAuth } from "../contexts/useAuth";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateOnly } from "../utils/format";
import type { DashboardOverviewResponse } from "../types/dashboard";

/**
 * Tela inicial do sistema com indicadores reais do backend.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError("");

        const response = await api.get<DashboardOverviewResponse>(
          "/dashboard/overview"
        );

        if (isMounted) {
          setData(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              err,
              "Não foi possível carregar os indicadores do dashboard."
            )
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const summaryCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      {
        title: "Famílias cadastradas",
        value: data.total_families,
        description: "Total geral de famílias registradas.",
      },
      {
        title: "Famílias ativas",
        value: data.active_families,
        description: "Famílias em acompanhamento ativo.",
      },
      {
        title: "Aptas recorrentes",
        value: data.recurring_eligible_families,
        description: "Famílias com apoio recorrente.",
      },
      {
        title: "Aptas emergenciais",
        value: data.emergency_eligible_families,
        description: "Famílias com apoio emergencial.",
      },
      {
        title: "Em análise",
        value: data.under_review_families,
        description: "Famílias aguardando decisão.",
      },
      {
        title: "Entregas no mês",
        value: data.deliveries_this_month,
        description: "Entregas concluídas no mês atual.",
      },
      {
        title: "Agendamentos pendentes",
        value: data.pending_schedules,
        description: "Retiradas ainda não concluídas.",
      },
      {
        title: "Itens em alerta",
        value: data.items_below_minimum_count,
        description: "Itens abaixo do estoque mínimo.",
      },
    ];
  }, [data]);

  const quickActions = useMemo(() => {
    const roles = user?.roles ?? [];
    const actions: Array<{
      to: string;
      label: string;
      icon:
        | "families"
        | "items"
        | "baskets"
        | "deliveries"
        | "users";
    }> = [];

    if (roles.some((role) => role === "admin" || role === "lider_social")) {
      actions.push({ to: "/families", label: "Abrir famílias", icon: "families" });
    }

    if (roles.some((role) => role === "admin" || role === "operador")) {
      actions.push({ to: "/items", label: "Ver estoque", icon: "items" });
      actions.push({ to: "/basket-types", label: "Montar cestas", icon: "baskets" });
      actions.push({
        to: "/deliveries",
        label: "Planejar entregas",
        icon: "deliveries",
      });
    }

    if (roles.includes("admin")) {
      actions.push({ to: "/users", label: "Gerir usuários", icon: "users" });
    }

    return actions.slice(0, 4);
  }, [user]);

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="hero-card">
          <h2>Dashboard</h2>
          <p>Carregando indicadores do Cesta Digital...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard-page">
        <div className="hero-card">
          <h2>Dashboard</h2>
          <p className="status-error" role="alert" aria-live="polite">
            {error || "Não foi possível montar o dashboard."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <section className="hero-card hero-card--dashboard">
        <div className="hero-card__main">
          <p className="eyebrow">Visão geral</p>
          <h2>Dashboard do Cesta Digital</h2>
          <p className="hero-card__description">
            Acompanhe famílias, entregas, estoque e capacidade de montagem de
            cestas em tempo real.
          </p>

          <div className="hero-actions">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="button button--secondary button--link button--icon"
              >
                <AppIcon name={action.icon} className="button__icon" />
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="hero-card__side">
          <div className="hero-status-card">
            <p className="eyebrow">Ritmo da operação</p>
            <strong className="hero-status-card__value">
              {data.deliveries_this_month} entregas no mês
            </strong>
            <p className="hero-status-card__text">
              Use os atalhos abaixo para seguir com atendimento social, estoque
              e logística.
            </p>
          </div>

          <div className="hero-badges">
            <span className="hero-badge">
              Reavaliações próximas: {data.upcoming_revaluations_count}
            </span>
            <span className="hero-badge">
              Famílias inativas: {data.inactive_families}
            </span>
          </div>

          <div className="operation-flow" aria-label="Fluxo operacional">
            <span>Atendimento</span>
            <span>Estoque</span>
            <span>Entrega</span>
          </div>
        </div>
      </section>

      <MetricGrid items={summaryCards} />

      <section className="content-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Cestas</p>
              <h3>Cestas possíveis por tipo</h3>
            </div>
          </div>

          {data.basket_summaries.length === 0 ? (
            <p className="empty-state">
              Nenhum tipo de cesta ativo encontrado.
            </p>
          ) : (
            <div className="stack-list">
              {data.basket_summaries.map((basket) => (
                <div key={basket.basket_type_id} className="stack-item">
                  <div>
                    <strong>{basket.basket_type_name}</strong>
                    <p className="stack-item__muted">
                      Tipo de cesta configurado no sistema.
                    </p>
                  </div>

                  <span className="pill pill--primary">
                    {basket.possible_baskets} possíveis
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Reavaliações</p>
              <h3>Próximas reavaliações</h3>
            </div>
          </div>

          {data.upcoming_revaluations.length === 0 ? (
            <p className="empty-state">
              Nenhuma reavaliação próxima encontrada.
            </p>
          ) : (
            <div className="stack-list">
              {data.upcoming_revaluations.map((item) => (
                <div key={item.family_id} className="stack-item">
                  <div>
                    <strong>{item.internal_code}</strong>
                    <p className="stack-item__muted">
                      Status atual: {item.status}
                    </p>
                  </div>

                  <span className="pill">
                    {formatDateOnly(item.next_revaluation_date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="content-grid content-grid--single">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Estoque</p>
              <h3>Itens abaixo do mínimo</h3>
            </div>
          </div>

          {data.stock_alerts.length === 0 ? (
            <p className="empty-state">
              Nenhum item está abaixo do mínimo no momento.
            </p>
          ) : (
            <DataTable caption="Itens abaixo do minimo">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Categoria</th>
                    <th>Quantidade</th>
                    <th>Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stock_alerts.map((alert) => (
                    <tr key={alert.item_id}>
                      <td>{alert.item_name}</td>
                      <td>{alert.category_name}</td>
                      <td>{alert.total_quantity}</td>
                      <td>{alert.minimum_stock_alert}</td>
                    </tr>
                  ))}
                </tbody>
            </DataTable>
          )}
        </article>
      </section>
    </div>
  );
}
