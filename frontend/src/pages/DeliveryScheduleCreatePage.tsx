import { useEffect, useState } from "react";
import { ArrowLeft, CalendarPlus, CheckCircle2, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { BasketTypeResponse } from "../types/basket";
import type {
  DeliveryScheduleCreatePayload,
  DeliveryScheduleResponse,
} from "../types/delivery";
import type { FamilyListItemResponse } from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";
import { formatTodayForInput } from "../utils/format";
import styles from "./DeliveryScheduleCreatePage.module.css";

export function DeliveryScheduleCreatePage() {
  const navigate = useNavigate();
  const [families, setFamilies] = useState<FamilyListItemResponse[]>([]);
  const [basketTypes, setBasketTypes] = useState<BasketTypeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    family_id: "",
    basket_type_id: "",
    scheduled_date: formatTodayForInput(),
    status: "agendado",
    notes: "",
  });

  const eligibleFamilies = families.filter(
    (family) =>
      family.status === "apta_recorrente" || family.status === "apta_emergencial",
  );

  useEffect(() => {
    let isMounted = true;

    void Promise.all([
      api.get<FamilyListItemResponse[]>("/families", { params: { limit: 200 } }),
      api.get<BasketTypeResponse[]>("/basket-types", { params: { limit: 200 } }),
    ])
      .then(([familiesResponse, basketTypesResponse]) => {
        if (!isMounted) return;
        setFamilies(familiesResponse.data);
        setBasketTypes(basketTypesResponse.data);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setError(
          getApiErrorMessage(
            requestError,
            "Não foi possível carregar famílias e tipos de cesta.",
          ),
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formData.family_id || !formData.basket_type_id) {
      setError("Selecione a família e o tipo de cesta.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: DeliveryScheduleCreatePayload = {
        family_id: Number(formData.family_id),
        basket_type_id: Number(formData.basket_type_id),
        scheduled_date: formData.scheduled_date,
        status: formData.status,
        notes: formData.notes.trim() || null,
      };
      await api.post<DeliveryScheduleResponse>("/delivery-schedules", payload);
      navigate("/deliveries", {
        state: {
          flash: { type: "success", message: "Agendamento criado com sucesso." },
        },
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Não foi possível criar o agendamento."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Link to="/deliveries" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" /> Voltar
        </Link>
        <div>
          <span>Agenda de distribuição</span>
          <h1>Nova entrega</h1>
          <p>Vincule uma família apta a uma cesta disponível para criar o agendamento.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className={styles.formCard}>
        <div className={styles.formHeading}>
          <span className={styles.formIcon}><CalendarPlus aria-hidden="true" /></span>
          <div>
            <h2>Informações do agendamento</h2>
            <p>A promessa respeita a decisão social e a capacidade real do estoque.</p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Família apta <b>*</b></span>
            <select
              name="family_id"
              value={formData.family_id}
              onChange={handleInputChange}
              disabled={isLoading || eligibleFamilies.length === 0}
              required
            >
              <option value="">Selecione</option>
              {eligibleFamilies.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.internal_code} · {family.city}/{family.state} · {family.status === "apta_recorrente" ? "Apta recorrente" : "Apta emergencial"}
                </option>
              ))}
            </select>
            <small>
              A aptidão exibida é a decisão vigente da avaliação social da família.
            </small>
          </label>

          <label className={styles.field}>
            <span>Tipo de cesta <b>*</b></span>
            <select
              name="basket_type_id"
              value={formData.basket_type_id}
              onChange={handleInputChange}
              aria-describedby="basket-type-schedule-help"
              disabled={isLoading}
              required
            >
              <option value="">Selecione</option>
              {basketTypes.filter((basketType) => basketType.is_active).map((basketType) => (
                <option key={basketType.id} value={basketType.id}>{basketType.name}</option>
              ))}
            </select>
            <small id="basket-type-schedule-help">
              O sistema bloqueia a promessa quando não há receita ou estoque suficiente.
            </small>
          </label>

          <label className={styles.field}>
            <span>Data agendada <b>*</b></span>
            <input
              type="date"
              name="scheduled_date"
              value={formData.scheduled_date}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Status inicial</span>
            <select name="status" value={formData.status} onChange={handleInputChange}>
              <option value="agendado">Agendada</option>
              <option value="cancelado">Cancelada</option>
            </select>
          </label>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Observações</span>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
            />
          </label>
        </div>

        {!isLoading && eligibleFamilies.length === 0 ? (
          <div className={styles.eligibilityWarning} role="status">
            <Info aria-hidden="true" />
            <div>
              <strong>Nenhuma família apta disponível</strong>
              <p>Conclua ou revise a avaliação social antes de criar uma entrega.</p>
            </div>
          </div>
        ) : null}

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <div className={styles.actions}>
          <Link to="/deliveries" className={styles.secondaryAction}>Cancelar</Link>
          <button
            type="submit"
            className={styles.primaryAction}
            disabled={isSubmitting || isLoading || eligibleFamilies.length === 0}
          >
            <CheckCircle2 aria-hidden="true" />
            {isSubmitting ? "Salvando…" : "Criar agendamento"}
          </button>
        </div>
      </form>
    </div>
  );
}
