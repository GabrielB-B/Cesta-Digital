import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { getApiErrorMessage } from "../utils/api-error";
import type {
  FamilyBenefitResponse,
  FamilyBenefitUpdatePayload,
  FamilyDetailResponse,
} from "../types/family";

function buildBenefitForm(benefit: FamilyBenefitResponse) {
  return {
    person_id: benefit.person_id ? String(benefit.person_id) : "",
    benefit_type: benefit.benefit_type,
    monthly_amount: Number(benefit.monthly_amount),
    counts_as_income: benefit.counts_as_income,
    is_active: benefit.is_active,
    start_date: benefit.start_date ?? "",
    end_date: benefit.end_date ?? "",
    notes: benefit.notes ?? "",
  };
}

export function FamilyBenefitEditPage() {
  const navigate = useNavigate();
  const { familyId, benefitId } = useParams();

  const [family, setFamily] = useState<FamilyDetailResponse | null>(null);
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadBenefit() {
      try {
        setIsLoading(true);
        setError("");

        const response = await api.get<FamilyDetailResponse>(`/families/${familyId}`);
        const benefit = response.data.benefits.find(
          (item) => String(item.id) === benefitId
        );

        if (!benefit) {
          throw new Error("Beneficio nao encontrado");
        }

        if (isMounted) {
          setFamily(response.data);
          setFormData(buildBenefitForm(benefit));
        }
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, "Nao foi possivel carregar o beneficio."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (familyId && benefitId) {
      void loadBenefit();
    }

    return () => {
      isMounted = false;
    };
  }, [familyId, benefitId]);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!familyId || !benefitId) {
      setError("Beneficio ou familia nao identificada.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: FamilyBenefitUpdatePayload = {
        person_id: formData.person_id ? Number(formData.person_id) : null,
        benefit_type: formData.benefit_type.trim(),
        monthly_amount: Number(formData.monthly_amount),
        counts_as_income: formData.counts_as_income,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        notes: formData.notes.trim() || null,
      };

      await api.put(`/benefits/${benefitId}`, payload);
      navigate(`/families/${familyId}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel atualizar o beneficio."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!familyId || !benefitId) {
      setError("Beneficio ou familia nao identificada.");
      return;
    }

    if (!window.confirm("Deseja realmente excluir este beneficio?")) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await api.delete(`/benefits/${benefitId}`);
      navigate(`/families/${familyId}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel excluir o beneficio."));
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <p className="empty-state">Carregando beneficio...</p>
        </div>
      </div>
    );
  }

  if (error && !family) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <p className="status-error">{error}</p>
          <div className="panel-actions">
            <Link to={`/families/${familyId}`} className="button button--secondary">
              Voltar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Beneficio</p>
          <h2>Editar beneficio</h2>
          <p className="hero-card__description">
            Ajuste o beneficio vinculado a familia sem perder rastreabilidade operacional.
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
              required
            />
          </label>

          <label className="form__group">
            <span>Valor mensal</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="monthly_amount"
              value={formData.monthly_amount}
              onChange={handleInputChange}
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

        {error ? <p className="status-error">{error}</p> : null}

        <div className="panel-actions panel-actions--spread">
          <button
            type="button"
            className="button button--danger"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
          >
            {isDeleting ? "Excluindo..." : "Excluir beneficio"}
          </button>

          <div className="inline-actions">
            <Link
              to={`/families/${familyId}`}
              className="button button--secondary button--link"
            >
              Cancelar
            </Link>

            <button type="submit" className="button" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar alteracoes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
