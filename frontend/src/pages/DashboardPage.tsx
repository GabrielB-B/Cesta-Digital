import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { AppIcon } from "../components/AppIcon";
import { DataTable } from "../components/DataTable";
import { MetricGrid, type MetricGridItem } from "../components/MetricGrid";
import { useAuth } from "../contexts/useAuth";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateOnly } from "../utils/format";
import type { DashboardOverviewResponse } from "../types/dashboard";

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
              "Nao foi possivel carregar os indicadores do dashboard."
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

  const summaryCards = useMemo<MetricGridItem[]>(() => {
    if (!data) {
      return [];
    }

    return [
      {
        title: "Familias acompanhadas",
        value: data.active_families,
        description:
          data.total_families > 0
            ? `${data.total_families} familias registradas no total.`
            : "Nenhuma familia cadastrada ainda.",
        tone: "social",
        emphasis: data.active_families > 0,
        actionTo: data.total_families === 0 ? "/families/new" : undefined,
        actionLabel: data.total_families === 0 ? "Cadastrar familia" : undefined,
      },
      {
        title: "Itens em alerta",
        value: data.items_below_minimum_count,
        description:
          data.items_below_minimum_count > 0
            ? "Entrada de alimentos precisa de atencao."
            : "Nenhum item em alerta.",
        tone: data.items_below_minimum_count > 0 ? "attention" : "stock",
        emphasis: data.items_below_minimum_count > 0,
        actionTo: "/items",
        actionLabel: "Ver estoque",
      },
      {
        title: "Retiradas pendentes",
        value: data.pending_schedules,
        description:
          data.pending_schedules > 0
            ? "Agendamentos ainda nao concluidos."
            : "Nenhuma retirada pendente.",
        tone: data.pending_schedules > 0 ? "delivery" : "neutral",
        actionTo: data.pending_schedules === 0 ? "/deliveries" : undefined,
        actionLabel:
          data.pending_schedules === 0 ? "Planejar entrega" : undefined,
      },
      {
        title: "Entregas no mes",
        value: data.deliveries_this_month,
        description:
          data.deliveries_this_month > 0
            ? "Baixas concluidas no mes atual."
            : "Nenhuma entrega registrada neste mes.",
        tone: "delivery",
      },
      {
        title: "Aptas recorrentes",
        value: data.recurring_eligible_families,
        description:
          data.recurring_eligible_families > 0
            ? "Acompanhamento social continuo."
            : "Nenhuma familia recorrente no momento.",
        tone: "social",
      },
      {
        title: "Em analise",
        value: data.under_review_families,
        description:
          data.under_review_families > 0
            ? "Familias aguardando decisao."
            : "Nenhuma familia aguardando analise.",
        tone: "neutral",
      },
    ];
  }, [data]);

  const dashboardSignals = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      {
        label: "Social",
        value: data.active_families,
        detail:
          data.active_families > 0
            ? "familias ativas"
            : "comece pelo cadastro",
        tone: "social",
      },
      {
        label: "Estoque",
        value: data.items_below_minimum_count,
        detail:
          data.items_below_minimum_count > 0
            ? "itens pedem reposicao"
            : "sem alerta critico",
        tone: data.items_below_minimum_count > 0 ? "attention" : "stock",
      },
      {
        label: "Entregas",
        value: data.pending_schedules,
        detail:
          data.pending_schedules > 0
            ? "retiradas pendentes"
            : "agenda em dia",
        tone: "delivery",
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
      actions.push({
        to: "/families",
        label: "Familias",
        icon: "families",
      });
    }

    if (roles.some((role) => role === "admin" || role === "operador")) {
      actions.push({ to: "/items", label: "Estoque", icon: "items" });
      actions.push({ to: "/basket-types", label: "Cestas", icon: "baskets" });
      actions.push({
        to: "/deliveries",
        label: "Entregas",
        icon: "deliveries",
      });
    }

    if (roles.includes("admin")) {
      actions.push({ to: "/users", label: "Usuarios", icon: "users" });
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
            {error || "Nao foi possivel montar o dashboard."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <section className="hero-card hero-card--dashboard">
        <div className="hero-card__main">
          <p className="eyebrow">Visao geral</p>
          <h2>Dashboard do Cesta Digital</h2>
          <p className="hero-card__description">
            Acompanhe familias, estoque de alimentos e entregas de cestas em
            tempo real.
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
            <p className="eyebrow">Acompanhamento do mes</p>
            <strong className="hero-status-card__value">
              {data.deliveries_this_month} entregas
            </strong>
            <p className="hero-status-card__text">
              O painel destaca onde agir primeiro: familias, estoque ou
              retiradas.
            </p>
          </div>

          <div className="dashboard-signal-grid" aria-label="Sinais principais">
            {dashboardSignals.map((signal) => (
              <div
                key={signal.label}
                className={`dashboard-signal dashboard-signal--${signal.tone}`}
              >
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
                <p>{signal.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="dashboard-prioridades">
        <div className="dashboard-section__header">
          <div>
            <p className="eyebrow">Leitura operacional</p>
            <h3 id="dashboard-prioridades">Prioridades do dia</h3>
          </div>
          <p>
            Sinais simples para orientar atendimento social, estoque e agenda de
            retirada.
          </p>
        </div>

        <MetricGrid items={summaryCards} className="stats-grid--dashboard" />
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Cestas</p>
              <h3>Cestas possiveis por tipo</h3>
            </div>
          </div>

          {data.basket_summaries.length === 0 ? (
            <div className="empty-state empty-state--with-action">
              <span>
                Nenhum tipo de cesta ativo. Comece configurando uma cesta padrao.
              </span>
              <Link className="empty-state__action" to="/basket-types">
                Montar cestas
              </Link>
            </div>
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
                    {basket.possible_baskets} possiveis
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Reavaliacoes</p>
              <h3>Proximas reavaliacoes</h3>
            </div>
          </div>

          {data.upcoming_revaluations.length === 0 ? (
            <div className="empty-state">
              Nenhuma reavaliacao proxima. O acompanhamento esta em dia.
            </div>
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
              <h3>Itens abaixo do minimo</h3>
            </div>
          </div>

          {data.stock_alerts.length === 0 ? (
            <div className="empty-state empty-state--with-action">
              <span>
                Nenhum item em alerta. O estoque esta dentro dos limites
                cadastrados.
              </span>
              <Link className="empty-state__action" to="/items">
                Ver estoque
              </Link>
            </div>
          ) : (
            <DataTable caption="Itens abaixo do minimo">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoria</th>
                  <th>Quantidade</th>
                  <th>Minimo</th>
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
