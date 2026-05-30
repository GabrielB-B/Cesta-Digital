import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { CurrencyInput } from "../components/CurrencyInput";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDecimalInputValue } from "../utils/format";
import type {
  FamilyBenefitCreatePayload,
  FamilyBenefitResponse,
  FamilyDetailResponse,
} from "../types/family";

export function FamilyBenefitCreatePage() {
  const navigate = useNavigate();
  const { familyId } = useParams();

  const [family, setFamily] = useState<FamilyDetailResponse | null>(null);
  const [isLoadingFamily, setIsLoadingFamily] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    person_id: "",
    benefit_type: "",
    monthly_amount: 0,
    counts_as_income: true,
    is_active: true,
    start_date: "",
    end_date: "",
    notes: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadFamily() {
      try {
        setIsLoadingFamily(true);
        setError("");
        const response = await api.get<FamilyDetailResponse>(`/families/${familyId}`);

        if (isMounted) {
          setFamily(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, "Nao foi possivel carregar a familia."));
        }
      } finally {
        if (isMounted) {
          setIsLoadingFamily(false);
        }
      }
    }

    if (familyId) {
      void loadFamily();
    }

    return () => {
      isMounted = false;
    };
  }, [familyId]);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = event.target as HTMLInputElement;

    if (type === "checkbox") {
      setFormData((previous) => ({
        ...previous,
        [name]: (event.target as HTMLInputElement).checked,
      }));
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleCurrencyBlur(event: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: formatDecimalInputValue(value),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!familyId) {
      setError("Familia nao identificada.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: FamilyBenefitCreatePayload = {
        person_id: formData.person_id ? Number(formData.person_id) : null,
        benefit_type: formData.benefit_type.trim(),
        monthly_amount: Number(formData.monthly_amount),
        counts_as_income: formData.counts_as_income,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        notes: formData.notes.trim() || null,
      };

      await api.post<FamilyBenefitResponse>(`/families/${familyId}/benefits`, payload);
      navigate(`/families/${familyId}`, {
        state: {
          flash: {
            type: "success",
            message: "Benefício cadastrado com sucesso.",
          },
        },
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel cadastrar o beneficio."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Beneficio</p>
          <h2>Novo beneficio</h2>
          <p className="hero-card__description">
            Cadastre beneficios vinculados a familia para refletir melhor a situacao social e a renda.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="panel-card form-panel">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Cadastro</p>
            <h3>Dados do beneficio</h3>
          </div>
        </div>

        <div className="form-grid">
          <label className="form__group">
            <span>Pessoa vinculada</span>
            <select
              name="person_id"
              value={formData.person_id}
              onChange={handleInputChange}
              disabled={isLoadingFamily}
            >
              <option value="">Sem vinculo especifico</option>
              {family?.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="form__group">
            <span>Tipo do beneficio</span>
            <input
              name="benefit_type"
              value={formData.benefit_type}
              onChange={handleInputChange}
              placeholder="Ex.: Bolsa Familia"
              required
            />
          </label>

          <label className="form__group">
            <span>Valor mensal</span>
            <CurrencyInput
              name="monthly_amount"
              value={formData.monthly_amount}
              onChange={handleInputChange}
              onBlur={handleCurrencyBlur}
              required
            />
          </label>

          <label className="form__group">
            <span>Inicio</span>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Fim</span>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleInputChange}
            />
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="counts_as_income"
              checked={formData.counts_as_income}
              onChange={handleInputChange}
            />
            <span>Conta como renda</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
            />
            <span>Beneficio ativo</span>
          </label>

          <label className="form__group form__group--wide">
            <span>Observacoes</span>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
            />
          </label>
        </div>

        {error ? (
          <p className="status-error" role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}

        <div className="panel-actions">
          <Link
            to={`/families/${familyId}`}
            className="button button--secondary button--link"
          >
            Cancelar
          </Link>

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Cadastrar beneficio"}
          </button>
        </div>
      </form>
    </div>
  );
}
