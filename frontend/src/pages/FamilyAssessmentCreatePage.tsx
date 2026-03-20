import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  FamilyAssessmentCreatePayload,
  FamilyAssessmentResponse,
} from "../types/family";

/**
 * Cadastro de avaliação social vinculada à família.
 */
export function FamilyAssessmentCreatePage() {
  const navigate = useNavigate();
  const { familyId } = useParams();

  const [formData, setFormData] = useState({
    assessment_date: new Date().toISOString().slice(0, 10),
    vulnerability_score: 0,
    system_suggestion: "apta_emergencial",
    final_decision: "apta_emergencial",
    decision_reason: "",
    exception_reason: "",
    next_revaluation_date: "",
    technical_notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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

    if (!familyId) {
      setError("Família não identificada.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: FamilyAssessmentCreatePayload = {
        assessment_date: formData.assessment_date,
        vulnerability_score: Number(formData.vulnerability_score),
        system_suggestion: formData.system_suggestion,
        final_decision: formData.final_decision,
        decision_reason: formData.decision_reason.trim() || null,
        exception_reason: formData.exception_reason.trim() || null,
        co_approved_by_user_id: null,
        next_revaluation_date: formData.next_revaluation_date || null,
        technical_notes: formData.technical_notes.trim() || null,
      };

      await api.post<FamilyAssessmentResponse>(
        `/families/${familyId}/assessments`,
        payload
      );
      navigate(`/families/${familyId}`);
    } catch {
      setError("Não foi possível cadastrar a avaliação social.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Avaliação social</p>
          <h2>Nova avaliação</h2>
          <p className="hero-card__description">
            Registre a decisão técnica e o histórico social da família.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="panel-card form-panel">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Avaliação</p>
            <h3>Dados da análise</h3>
          </div>
        </div>

        <div className="form-grid">
          <label className="form__group">
            <span>Data da avaliação</span>
            <input
              type="date"
              name="assessment_date"
              value={formData.assessment_date}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="form__group">
            <span>Pontuação de vulnerabilidade</span>
            <input
              type="number"
              min="0"
              name="vulnerability_score"
              value={formData.vulnerability_score}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="form__group">
            <span>Sugestão do sistema</span>
            <select
              name="system_suggestion"
              value={formData.system_suggestion}
              onChange={handleInputChange}
            >
              <option value="apta_recorrente">Apta recorrente</option>
              <option value="apta_emergencial">Apta emergencial</option>
              <option value="em_analise">Em análise</option>
              <option value="inapta">Inapta</option>
              <option value="inativa">Inativa</option>
            </select>
          </label>

          <label className="form__group">
            <span>Decisão final</span>
            <select
              name="final_decision"
              value={formData.final_decision}
              onChange={handleInputChange}
            >
              <option value="apta_recorrente">Apta recorrente</option>
              <option value="apta_emergencial">Apta emergencial</option>
              <option value="em_analise">Em análise</option>
              <option value="inapta">Inapta</option>
              <option value="inativa">Inativa</option>
            </select>
          </label>

          <label className="form__group">
            <span>Próxima reavaliação</span>
            <input
              type="date"
              name="next_revaluation_date"
              value={formData.next_revaluation_date}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group form__group--wide">
            <span>Motivo da decisão</span>
            <textarea
              name="decision_reason"
              value={formData.decision_reason}
              onChange={handleInputChange}
              rows={3}
            />
          </label>

          <label className="form__group form__group--wide">
            <span>Motivo de exceção</span>
            <textarea
              name="exception_reason"
              value={formData.exception_reason}
              onChange={handleInputChange}
              rows={3}
            />
          </label>

          <label className="form__group form__group--wide">
            <span>Observações técnicas</span>
            <textarea
              name="technical_notes"
              value={formData.technical_notes}
              onChange={handleInputChange}
              rows={4}
            />
          </label>
        </div>

        {error ? <p className="status-error">{error}</p> : null}

        <div className="panel-actions">
          <Link
            to={`/families/${familyId}`}
            className="button button--secondary button--link"
          >
            Cancelar
          </Link>

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Cadastrar avaliação"}
          </button>
        </div>
      </form>
    </div>
  );
}