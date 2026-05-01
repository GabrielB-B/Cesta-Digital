import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getApiErrorMessage } from "../utils/api-error";
import { formatTodayForInput } from "../utils/format";
import type { BasketTypeResponse } from "../types/basket";
import type {
  DeliveryScheduleCreatePayload,
  DeliveryScheduleResponse,
} from "../types/delivery";
import type { FamilyListItemResponse } from "../types/family";

/**
 * Formulário de criação de agendamento de retirada.
 */
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

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      try {
        setIsLoading(true);
        const [familiesResponse, basketTypesResponse] = await Promise.all([
          api.get<FamilyListItemResponse[]>("/families"),
          api.get<BasketTypeResponse[]>("/basket-types"),
        ]);

        if (isMounted) {
          setFamilies(familiesResponse.data);
          setBasketTypes(basketTypesResponse.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              err,
              "Não foi possível carregar famílias e tipos de cesta."
            )
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
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
      navigate("/deliveries");
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível criar o agendamento."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Agendamento</p>
          <h2>Novo agendamento</h2>
          <p className="hero-card__description">
            Registre uma retirada futura vinculando a família ao tipo de cesta.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="panel-card form-panel">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Dados</p>
            <h3>Informações do agendamento</h3>
          </div>
        </div>

        <div className="form-grid">
          <label className="form__group">
            <span>Família</span>
            <select
              name="family_id"
              value={formData.family_id}
              onChange={handleInputChange}
              disabled={isLoading}
              required
            >
              <option value="">Selecione</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.internal_code} - {family.city}/{family.state}
                </option>
              ))}
            </select>
          </label>

          <label className="form__group">
            <span>Tipo de cesta</span>
            <select
              name="basket_type_id"
              value={formData.basket_type_id}
              onChange={handleInputChange}
              disabled={isLoading}
              required
            >
              <option value="">Selecione</option>
              {basketTypes.map((basketType) => (
                <option key={basketType.id} value={basketType.id}>
                  {basketType.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form__group">
            <span>Data agendada</span>
            <input
              type="date"
              name="scheduled_date"
              value={formData.scheduled_date}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="form__group">
            <span>Status inicial</span>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="agendado">Agendado</option>
              <option value="reagendado">Reagendado</option>
              <option value="faltou">Faltou</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </label>

          <label className="form__group form__group--wide">
            <span>Observações</span>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
            />
          </label>
        </div>

        {error ? <p className="status-error">{error}</p> : null}

        <div className="panel-actions">
          <Link to="/deliveries" className="button button--secondary button--link">
            Cancelar
          </Link>

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Criar agendamento"}
          </button>
        </div>
      </form>
    </div>
  );
}
