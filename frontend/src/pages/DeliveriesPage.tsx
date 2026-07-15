import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { DataTable } from "../components/DataTable";
import { MetricGrid } from "../components/MetricGrid";
import { PageHeader } from "../components/PageHeader";
import { PanelHeader } from "../components/PanelHeader";
import { PaginationControls } from "../components/PaginationControls";
import { StateMessage } from "../components/StateMessage";
import type { BasketTypeResponse } from "../types/basket";
import type {
  DeliveryFromScheduleCreatePayload,
  DeliveryResponse,
  DeliveryScheduleResponse,
  DeliveryScheduleUpdatePayload,
} from "../types/delivery";
import type { FamilyListItemResponse } from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateOnly, formatDateTime } from "../utils/format";

const PAGE_SIZE = 25;
const DELIVERY_PAGE_SIZE = 25;

type ScheduleDraft = {
  scheduled_date: string;
  status: string;
  notes: string;
};

export function DeliveriesPage() {
  const [schedules, setSchedules] = useState<DeliveryScheduleResponse[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryResponse[]>([]);
  const [families, setFamilies] = useState<FamilyListItemResponse[]>([]);
  const [basketTypes, setBasketTypes] = useState<BasketTypeResponse[]>([]);
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<number, ScheduleDraft>>(
    {}
  );
  const [statusFilter, setStatusFilter] = useState("");
  const [totalSchedules, setTotalSchedules] = useState(0);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [offset, setOffset] = useState(0);
  const [deliveryOffset, setDeliveryOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingScheduleId, setIsSubmittingScheduleId] = useState<number | null>(
    null
  );
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData(
    nextOffset = offset,
    activeStatus = statusFilter,
    nextDeliveryOffset = deliveryOffset
  ) {
    try {
      const [schedulesResponse, deliveriesResponse, familiesResponse, basketTypesResponse] =
        await Promise.all([
          api.get<DeliveryScheduleResponse[]>("/delivery-schedules", {
            params: {
              status: activeStatus || undefined,
              limit: PAGE_SIZE,
              offset: nextOffset,
            },
          }),
          api.get<DeliveryResponse[]>("/deliveries", {
            params: {
              limit: DELIVERY_PAGE_SIZE,
              offset: nextDeliveryOffset,
            },
          }),
          api.get<FamilyListItemResponse[]>("/families", {
            params: { limit: 200 },
          }),
          api.get<BasketTypeResponse[]>("/basket-types", {
            params: { limit: 200 },
          }),
        ]);

      setSchedules(schedulesResponse.data);
      setDeliveries(deliveriesResponse.data);
      setFamilies(familiesResponse.data);
      setBasketTypes(basketTypesResponse.data);
      setTotalSchedules(
        Number(schedulesResponse.headers["x-total-count"] ?? schedulesResponse.data.length)
      );
      setTotalDeliveries(
        Number(deliveriesResponse.headers["x-total-count"] ?? deliveriesResponse.data.length)
      );
      setOffset(nextOffset);
      setDeliveryOffset(nextDeliveryOffset);
      setScheduleDrafts(
        Object.fromEntries(
          schedulesResponse.data.map((schedule) => [
            schedule.id,
            {
              scheduled_date: schedule.scheduled_date,
              status: schedule.status,
              notes: schedule.notes ?? "",
            },
          ])
        )
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel carregar as entregas."));
    } finally {
      setIsLoading(false);
    }
  }

  function startDataLoad() {
    setIsLoading(true);
    setError("");
  }

  useEffect(() => {
    let isCurrent = true;

    void Promise.all([
      api.get<DeliveryScheduleResponse[]>("/delivery-schedules", {
        params: {
          limit: PAGE_SIZE,
          offset: 0,
        },
      }),
      api.get<DeliveryResponse[]>("/deliveries", {
        params: {
          limit: DELIVERY_PAGE_SIZE,
          offset: 0,
        },
      }),
      api.get<FamilyListItemResponse[]>("/families", {
        params: { limit: 200 },
      }),
      api.get<BasketTypeResponse[]>("/basket-types", {
        params: { limit: 200 },
      }),
    ])
      .then(
        ([
          schedulesResponse,
          deliveriesResponse,
          familiesResponse,
          basketTypesResponse,
        ]) => {
          if (!isCurrent) {
            return;
          }

          setSchedules(schedulesResponse.data);
          setDeliveries(deliveriesResponse.data);
          setFamilies(familiesResponse.data);
          setBasketTypes(basketTypesResponse.data);
          setTotalSchedules(
            Number(
              schedulesResponse.headers["x-total-count"] ??
                schedulesResponse.data.length
            )
          );
          setTotalDeliveries(
            Number(
              deliveriesResponse.headers["x-total-count"] ??
                deliveriesResponse.data.length
            )
          );
          setOffset(0);
          setDeliveryOffset(0);
          setScheduleDrafts(
            Object.fromEntries(
              schedulesResponse.data.map((schedule) => [
                schedule.id,
                {
                  scheduled_date: schedule.scheduled_date,
                  status: schedule.status,
                  notes: schedule.notes ?? "",
                },
              ])
            )
          );
        }
      )
      .catch((err) => {
        if (isCurrent) {
          setError(
            getApiErrorMessage(err, "Nao foi possivel carregar as entregas.")
          );
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const summary = useMemo(() => {
    return {
      totalSchedules,
      pendingSchedules: schedules.filter((schedule) => schedule.status === "agendado")
        .length,
      completedSchedules: schedules.filter((schedule) => schedule.status === "retirado")
        .length,
      totalDeliveries,
    };
  }, [schedules, totalSchedules, totalDeliveries]);

  function getFamilyCode(familyId: number): string {
    return (
      families.find((family) => family.id === familyId)?.internal_code ??
      `Familia #${familyId}`
    );
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
      setSuccessMessage("");
      setIsSubmittingScheduleId(scheduleId);

      const payload: DeliveryFromScheduleCreatePayload = {
        delivery_date: new Date().toISOString(),
        status: "concluida",
        notes: "Entrega registrada pela interface.",
      };

      await api.post(`/deliveries/from-schedule/${scheduleId}`, payload);
      setSuccessMessage("Entrega confirmada e estoque baixado automaticamente.");
      startDataLoad();
      await loadData(offset, statusFilter, deliveryOffset);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel confirmar a entrega."));
    } finally {
      setIsSubmittingScheduleId(null);
    }
  }

  async function handleSaveSchedule(scheduleId: number) {
    const draft = scheduleDrafts[scheduleId];
    if (!draft) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setIsSubmittingScheduleId(scheduleId);

      const payload: DeliveryScheduleUpdatePayload = {
        scheduled_date: draft.scheduled_date,
        status: draft.status,
        notes: draft.notes.trim() || null,
      };

      await api.put(`/delivery-schedules/${scheduleId}`, payload);
      setSuccessMessage("Agendamento atualizado com auditoria registrada.");
      startDataLoad();
      await loadData(offset, statusFilter, deliveryOffset);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel atualizar o agendamento."));
    } finally {
      setIsSubmittingScheduleId(null);
    }
  }

  async function handleCancelSchedule(schedule: DeliveryScheduleResponse) {
    const confirmed = window.confirm("Cancelar este agendamento?");
    if (!confirmed) {
      return;
    }

    setScheduleDrafts((previous) => ({
      ...previous,
      [schedule.id]: {
        scheduled_date: schedule.scheduled_date,
        status: "cancelado",
        notes: schedule.notes ?? "Cancelado pela interface.",
      },
    }));

    try {
      setError("");
      setSuccessMessage("");
      setIsSubmittingScheduleId(schedule.id);

      await api.put(`/delivery-schedules/${schedule.id}`, {
        scheduled_date: schedule.scheduled_date,
        status: "cancelado",
        notes: schedule.notes ?? "Cancelado pela interface.",
      } satisfies DeliveryScheduleUpdatePayload);
      setSuccessMessage("Agendamento cancelado.");
      startDataLoad();
      await loadData(offset, statusFilter, deliveryOffset);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel cancelar o agendamento."));
    } finally {
      setIsSubmittingScheduleId(null);
    }
  }

  async function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startDataLoad();
    await loadData(0, statusFilter, deliveryOffset);
  }

  function handleSchedulePageChange(nextOffset: number) {
    startDataLoad();
    void loadData(nextOffset);
  }

  function handleDeliveryPageChange(nextDeliveryOffset: number) {
    startDataLoad();
    void loadData(offset, statusFilter, nextDeliveryOffset);
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operacao"
        title="Agendamentos e entregas"
        description="Reagende, cancele e confirme retiradas com registro de auditoria e baixa automatica de estoque."
      />

      <MetricGrid
        items={[
          {
            title: "Agendamentos filtrados",
            value: summary.totalSchedules,
            description: "Resultado da consulta.",
          },
          {
            title: "Pendentes",
            value: summary.pendingSchedules,
            description: "Nesta pagina.",
          },
          {
            title: "Retirados",
            value: summary.completedSchedules,
            description: "Nesta pagina.",
          },
          {
            title: "Entregas",
            value: summary.totalDeliveries,
            description: "Historico registrado.",
          },
        ]}
      />

      {error ? (
        <StateMessage variant="error">{error}</StateMessage>
      ) : null}
      {successMessage ? (
        <StateMessage variant="success">{successMessage}</StateMessage>
      ) : null}

      <section className="panel-card">
        <PanelHeader
          eyebrow="Agendamentos"
          title="Retiradas programadas"
          actions={
            <form className="toolbar toolbar--row" onSubmit={handleApplyFilters}>
            <label className="toolbar__field toolbar__field--select">
              <span className="sr-only">Filtrar agendamentos por status</span>
              <select
                className="toolbar__input toolbar__input--select"
                name="schedule_status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="agendado">Agendados</option>
                <option value="cancelado">Cancelados</option>
                <option value="faltou">Faltou</option>
                <option value="reagendado">Reagendados</option>
                <option value="retirado">Retirados</option>
              </select>
            </label>

            <button type="submit" className="button" disabled={isLoading}>
              {isLoading ? "Consultando..." : "Aplicar"}
            </button>

            <Link to="/deliveries/schedules/new" className="button button--link">
              Novo agendamento
            </Link>
          </form>
          }
        />

        {isLoading ? (
          <StateMessage variant="loading">
            Carregando agendamentos...
          </StateMessage>
        ) : schedules.length === 0 ? (
          <StateMessage>Nenhum agendamento encontrado.</StateMessage>
        ) : (
          <>
            <DataTable caption="Retiradas programadas">
                <thead>
                  <tr>
                    <th>Familia</th>
                    <th>Cesta</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Observacao</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => {
                    const draft = scheduleDrafts[schedule.id];
                    const isLocked = schedule.status === "retirado";

                    return (
                      <tr key={schedule.id}>
                        <td>{getFamilyCode(schedule.family_id)}</td>
                        <td>{getBasketTypeName(schedule.basket_type_id)}</td>
                        <td>
                          {isLocked ? (
                            formatDateOnly(schedule.scheduled_date)
                          ) : (
                            <input
                              className="table-input"
                              type="date"
                              aria-label={`Data do agendamento da familia ${getFamilyCode(
                                schedule.family_id
                              )}`}
                              value={draft?.scheduled_date ?? schedule.scheduled_date}
                              onChange={(event) =>
                                setScheduleDrafts((previous) => ({
                                  ...previous,
                                  [schedule.id]: {
                                    ...(previous[schedule.id] ?? {
                                      scheduled_date: schedule.scheduled_date,
                                      status: schedule.status,
                                      notes: schedule.notes ?? "",
                                    }),
                                    scheduled_date: event.target.value,
                                  },
                                }))
                              }
                            />
                          )}
                        </td>
                        <td>
                          {isLocked ? (
                            <span className="pill pill--success">{schedule.status}</span>
                          ) : (
                            <select
                              className="table-input"
                              aria-label={`Status do agendamento da familia ${getFamilyCode(
                                schedule.family_id
                              )}`}
                              value={draft?.status ?? schedule.status}
                              onChange={(event) =>
                                setScheduleDrafts((previous) => ({
                                  ...previous,
                                  [schedule.id]: {
                                    ...(previous[schedule.id] ?? {
                                      scheduled_date: schedule.scheduled_date,
                                      status: schedule.status,
                                      notes: schedule.notes ?? "",
                                    }),
                                    status: event.target.value,
                                  },
                                }))
                              }
                            >
                              <option value="agendado">Agendado</option>
                              <option value="reagendado">Reagendado</option>
                              <option value="faltou">Faltou</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          )}
                        </td>
                        <td>
                          {isLocked ? (
                            schedule.notes ?? "-"
                          ) : (
                            <input
                              className="table-input table-input--wide"
                              aria-label={`Observacao do agendamento da familia ${getFamilyCode(
                                schedule.family_id
                              )}`}
                              value={draft?.notes ?? schedule.notes ?? ""}
                              onChange={(event) =>
                                setScheduleDrafts((previous) => ({
                                  ...previous,
                                  [schedule.id]: {
                                    ...(previous[schedule.id] ?? {
                                      scheduled_date: schedule.scheduled_date,
                                      status: schedule.status,
                                      notes: schedule.notes ?? "",
                                    }),
                                    notes: event.target.value,
                                  },
                                }))
                              }
                            />
                          )}
                        </td>
                        <td>
                          {isLocked ? (
                            <span className="table-muted">Sem acao</span>
                          ) : (
                            <div className="table-actions">
                              <button
                                type="button"
                                className="button button--secondary button--small"
                                onClick={() => void handleSaveSchedule(schedule.id)}
                                disabled={isSubmittingScheduleId === schedule.id}
                              >
                                Salvar
                              </button>
                              {schedule.status === "agendado" ? (
                                <button
                                  type="button"
                                  className="button button--small"
                                  onClick={() => void handleConfirmDelivery(schedule.id)}
                                  disabled={isSubmittingScheduleId === schedule.id}
                                >
                                  Confirmar
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="button button--danger button--small"
                                onClick={() => void handleCancelSchedule(schedule)}
                                disabled={isSubmittingScheduleId === schedule.id}
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
            </DataTable>

            <PaginationControls
              total={totalSchedules}
              offset={offset}
              limit={PAGE_SIZE}
              isLoading={isLoading}
              onPageChange={handleSchedulePageChange}
            />
          </>
        )}
      </section>

      <section className="panel-card">
        <PanelHeader eyebrow="Entregas" title="Historico de entregas" />

        {isLoading ? (
          <StateMessage variant="loading">Carregando entregas...</StateMessage>
        ) : deliveries.length === 0 ? (
          <StateMessage>Nenhuma entrega registrada.</StateMessage>
        ) : (
          <>
            <DataTable caption="Historico de entregas">
              <thead>
                <tr>
                  <th>Familia</th>
                  <th>Cesta</th>
                  <th>Data/hora</th>
                  <th>Status</th>
                  <th>Observacao</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>{getFamilyCode(delivery.family_id)}</td>
                    <td>{getBasketTypeName(delivery.basket_type_id)}</td>
                    <td>{formatDateTime(delivery.delivery_date)}</td>
                    <td>
                      <span className="pill pill--success">{delivery.status}</span>
                    </td>
                    <td>{delivery.notes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>

            <PaginationControls
              total={totalDeliveries}
              offset={deliveryOffset}
              limit={DELIVERY_PAGE_SIZE}
              isLoading={isLoading}
              onPageChange={handleDeliveryPageChange}
            />
          </>
        )}
      </section>
    </div>
  );
}
