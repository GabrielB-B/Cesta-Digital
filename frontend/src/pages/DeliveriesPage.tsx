import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { BasketTypeResponse } from "../types/basket";
import type {
  DeliveryFromScheduleCreatePayload,
  DeliveryResponse,
  DeliveryScheduleResponse,
} from "../types/delivery";
import type { FamilyListItemResponse } from "../types/family";

/**
 * Tela operacional de agendamentos e entregas.
 * Permite confirmar a entrega diretamente pela interface.
 */
export function DeliveriesPage() {
  const [schedules, setSchedules] = useState<DeliveryScheduleResponse[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryResponse[]>([]);
  const [families, setFamilies] = useState<FamilyListItemResponse[]>([]);
  const [basketTypes, setBasketTypes] = useState<BasketTypeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingScheduleId, setIsSubmittingScheduleId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setIsLoading(true);
      setError("");

      const [schedulesResponse, deliveriesResponse, familiesResponse, basketTypesResponse] =
        await Promise.all([
          api.get<DeliveryScheduleResponse[]>("/delivery-schedules"),
          api.get<DeliveryResponse[]>("/deliveries"),
          api.get<FamilyListItemResponse[]>("/families"),
          api.get<BasketTypeResponse[]>("/basket-types"),
        ]);

      setSchedules(schedulesResponse.data);
      setDeliveries(deliveriesResponse.data);
      setFamilies(familiesResponse.data);
      setBasketTypes(basketTypesResponse.data);
    } catch {
      setError("Não foi possível carregar os dados de entregas.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const summary = useMemo(() => {
    return {
      totalSchedules: schedules.length,
      pendingSchedules: schedules.filter((schedule) => schedule.status === "agendado").length,
      completedSchedules: schedules.filter((schedule) => schedule.status === "retirado").length,
      totalDeliveries: deliveries.length,
    };
  }, [schedules, deliveries]);

  function getFamilyCode(familyId: number): string {
    return families.find((family) => family.id === familyId)?.internal_code ?? `Família #${familyId}`;
  }

  function getBasketTypeName(basketTypeId: number): string {
    return (
      basketTypes.find((basketType) => basketType.id === basketTypeId)?.name ??
      `Cesta #${basketTypeId}`
    );
  }

  async function handleConfirmDelivery(scheduleId: number) {
    try {
      setError("");
      setIsSubmittingScheduleId(scheduleId);

      const payload: DeliveryFromScheduleCreatePayload = {
        delivery_date: new Date().toISOString(),
        status: "concluida",
        notes: "Entrega registrada pela interface.",
      };

      await api.post(`/deliveries/from-schedule/${scheduleId}`, payload);
      await loadData();
    } catch {
      setError("Não foi possível confirmar a entrega deste agendamento.");
    } finally {
      setIsSubmittingScheduleId(null);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Operação</p>
          <h2>Agendamentos e entregas</h2>
          <p className="hero-card__description">
            Organize retiradas, acompanhe o status dos agendamentos e confirme entregas diretamente pela interface.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card__title">Agendamentos</p>
          <strong className="stat-card__value">{summary.totalSchedules}</strong>
          <span className="stat-card__description">Total registrado no sistema.</span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Pendentes</p>
          <strong className="stat-card__value">{summary.pendingSchedules}</strong>
          <span className="stat-card__description">Ainda aguardando retirada.</span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Retirados</p>
          <strong className="stat-card__value">{summary.completedSchedules}</strong>
          <span className="stat-card__description">Agendamentos já concluídos.</span>
        </article>

        <article className="stat-card">
          <p className="stat-card__title">Entregas</p>
          <strong className="stat-card__value">{summary.totalDeliveries}</strong>
          <span className="stat-card__description">Total de entregas registradas.</span>
        </article>
      </section>

      {error ? <p className="status-error">{error}</p> : null}

      <section className="panel-card">
        <div className="panel-card__header panel-card__header--actions">
          <div>
            <p className="eyebrow">Agendamentos</p>
            <h3>Retiradas programadas</h3>
          </div>

          <Link to="/deliveries/schedules/new" className="button button--link">
            Novo agendamento
          </Link>
        </div>

        {isLoading ? (
          <p className="empty-state">Carregando agendamentos...</p>
        ) : schedules.length === 0 ? (
          <p className="empty-state">Nenhum agendamento cadastrado.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Família</th>
                  <th>Cesta</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Observação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td>{getFamilyCode(schedule.family_id)}</td>
                    <td>{getBasketTypeName(schedule.basket_type_id)}</td>
                    <td>{new Date(schedule.scheduled_date).toLocaleDateString("pt-BR")}</td>
                    <td>
                      <span className="pill">{schedule.status}</span>
                    </td>
                    <td>{schedule.notes ?? "—"}</td>
                    <td>
                      {schedule.status === "agendado" ? (
                        <button
                          className="button button--small"
                          onClick={() => void handleConfirmDelivery(schedule.id)}
                          disabled={isSubmittingScheduleId === schedule.id}
                        >
                          {isSubmittingScheduleId === schedule.id
                            ? "Confirmando..."
                            : "Confirmar entrega"}
                        </button>
                      ) : (
                        <span className="table-muted">Sem ação</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel-card">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Entregas</p>
            <h3>Histórico de entregas</h3>
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">Carregando entregas...</p>
        ) : deliveries.length === 0 ? (
          <p className="empty-state">Nenhuma entrega registrada.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Família</th>
                  <th>Cesta</th>
                  <th>Data/hora</th>
                  <th>Status</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>{getFamilyCode(delivery.family_id)}</td>
                    <td>{getBasketTypeName(delivery.basket_type_id)}</td>
                    <td>{new Date(delivery.delivery_date).toLocaleString("pt-BR")}</td>
                    <td>
                      <span className="pill pill--success">{delivery.status}</span>
                    </td>
                    <td>{delivery.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}