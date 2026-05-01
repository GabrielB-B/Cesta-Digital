import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { getApiErrorMessage } from "../utils/api-error";
import { formatTodayForInput } from "../utils/format";
import type {
  EligibilityPreviewResponse,
  FamilyAssessmentCreatePayload,
  FamilyAssessmentResponse,
} from "../types/family";

/**
 * Cadastro de avaliação social com sugestão automática baseada
 * na renda per capita da família e score social complementar.
 */
export function FamilyAssessmentCreatePage() {
  const navigate = useNavigate();
  const { familyId } = useParams();

  const [preview, setPreview] = useState<EligibilityPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    assessment_date: formatTodayForInput(),
    vulnerability_score: 0,
    final_decision: "apta_emergencial",
    decision_reason: "",
    exception_reason: "",
    next_revaluation_date: "",
    technical_notes: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      try {
        setIsLoadingPreview(true);
        const response = await api.get<EligibilityPreviewResponse>(
          `/families/${familyId}/eligibility-preview`
        );

        if (isMounted) {
          setPreview(response.data);
          setFormData((previous) => ({
            ...previous,
            final_decision: response.data.system_suggestion,
            vulnerability_score: response.data.social_weight_score,
          }));
        }
      } catch (err) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              err,
              "Nao foi possivel carregar a sugestao automatica do sistema."
            )
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingPreview(false);
        }
      }
    }

    if (familyId) {
      void loadPreview();
    }

    return () => {
      isMounted = false;
    };
  }, [familyId]);

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

    const divergesFromSystem =
      preview && formData.final_decision !== preview.system_suggestion;

    const hasOverrideReason =
      formData.decision_reason.trim() || formData.exception_reason.trim();

    if (divergesFromSystem && !hasOverrideReason) {
      setError(
        "Quando a decisao final divergir da sugestao automatica, informe o motivo."
      );
      return;
    }

    const vulnerabilityScore = Number(formData.vulnerability_score);
    if (vulnerabilityScore < 0 || vulnerabilityScore > 100) {
      setError("A pontuacao de vulnerabilidade deve ficar entre 0 e 100.");
      return;
    }

    if (
      formData.next_revaluation_date &&
      formData.next_revaluation_date < formData.assessment_date
    ) {
      setError("A proxima reavaliacao nao pode ser anterior a avaliacao.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: FamilyAssessmentCreatePayload = {
        assessment_date: formData.assessment_date,
        vulnerability_score: vulnerabilityScore,
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
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel cadastrar a avaliacao social."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatCurrency(value: string): string {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Avaliação social</p>
          <h2>Nova avaliação</h2>
          <p className="hero-card__description">
            Registre a decisão técnica com base na sugestão econômica automática e nos agravantes sociais.
          </p>
        </div>
      </section>

      {isLoadingPreview ? (
        <div className="panel-card">
          <p className="empty-state">Carregando sugestão automática...</p>
        </div>
      ) : preview ? (
        <>
          <section className="panel-card">
            <div className="panel-card__header">
              <div>
                <p className="eyebrow">Motor econômico</p>
                <h3>Sugestão automática do sistema</h3>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span>Família</span>
                <strong>{preview.internal_code}</strong>
              </div>
              <div className="detail-item">
                <span>Renda per capita</span>
                <strong>{formatCurrency(preview.income_per_capita)}</strong>
              </div>
              <div className="detail-item">
                <span>Extrema pobreza</span>
                <strong>{formatCurrency(preview.extreme_poverty_limit)}</strong>
              </div>
              <div className="detail-item">
                <span>Pobreza</span>
                <strong>{formatCurrency(preview.poverty_limit)}</strong>
              </div>
              <div className="detail-item">
                <span>Faixa econômica</span>
                <strong>{preview.poverty_band}</strong>
              </div>
              <div className="detail-item">
                <span>Sugestão automática</span>
                <strong>{preview.system_suggestion}</strong>
              </div>
              <div className="detail-item form__group--wide">
                <span>Motivo econômico</span>
                <strong>{preview.economic_reason}</strong>
              </div>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-card__header">
              <div>
                <p className="eyebrow">Agravantes sociais</p>
                <h3>Score complementar</h3>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span>Score social</span>
                <strong>{preview.social_weight_score}</strong>
              </div>
              <div className="detail-item">
                <span>Prioridade</span>
                <strong>{preview.priority_level}</strong>
              </div>
            </div>

            {preview.social_aggravating_factors.length === 0 ? (
              <p className="empty-state">Nenhum agravante social identificado.</p>
            ) : (
              <div className="stack-list">
                {preview.social_aggravating_factors.map((factor) => (
                  <div key={factor} className="stack-item">
                    <strong>{factor}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      <form onSubmit={handleSubmit} className="panel-card form-panel">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Decisão</p>
            <h3>Registrar avaliação</h3>
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
            <span>Score de vulnerabilidade</span>
            <input
              type="number"
              min="0"
              max="100"
              name="vulnerability_score"
              value={formData.vulnerability_score}
              onChange={handleInputChange}
              required
            />
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
