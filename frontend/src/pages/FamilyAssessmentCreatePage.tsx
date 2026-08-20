import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  MapPin,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  EligibilityPreviewResponse,
  FamilyAssessmentCreatePayload,
  FamilyAssessmentResponse,
  FamilyDetailResponse,
} from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";
import { formatCurrency, formatTodayForInput } from "../utils/format";
import styles from "./FamilyAssessmentCreatePage.module.css";

const decisionOptions = [
  { value: "apta_recorrente", label: "Apta recorrente" },
  { value: "apta_emergencial", label: "Apta emergencial" },
  { value: "em_analise", label: "Em análise" },
  { value: "inapta", label: "Inapta" },
  { value: "inativa", label: "Inativa" },
];

function formatDecision(value: string): string {
  return decisionOptions.find((option) => option.value === value)?.label ?? value;
}

function formatPriority(value: string): string {
  const labels: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    urgente: "Urgente",
  };
  return labels[value] ?? value;
}

function formatFactor(value: string): string {
  const labels: Record<string, string> = {
    has_disabled_member: "Pessoa com deficiência na família",
    has_chronic_illness_member: "Condição crônica na família",
    has_pregnant_member: "Gestante na família",
    has_unemployed_member: "Desemprego na família",
    needs_extra_support: "Necessidade de apoio adicional",
    lacks_sanitation: "Moradia sem saneamento",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

export function FamilyAssessmentCreatePage() {
  const navigate = useNavigate();
  const { familyId } = useParams();
  const [preview, setPreview] = useState<EligibilityPreviewResponse | null>(null);
  const [family, setFamily] = useState<FamilyDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(familyId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(familyId ? "" : "Família não identificada.");
  const [formData, setFormData] = useState({
    assessment_date: formatTodayForInput(),
    final_decision: "em_analise",
    decision_reason: "",
    exception_reason: "",
    next_revaluation_date: "",
    technical_notes: "",
  });

  useEffect(() => {
    if (!familyId) {
      return;
    }

    let isCurrent = true;

    void Promise.all([
      api.get<EligibilityPreviewResponse>(`/families/${familyId}/eligibility-preview`),
      api.get<FamilyDetailResponse>(`/families/${familyId}`),
    ])
      .then(([previewResponse, familyResponse]) => {
        if (!isCurrent) return;
        setPreview(previewResponse.data);
        setFamily(familyResponse.data);
        setFormData((previous) => ({
          ...previous,
          final_decision: previewResponse.data.system_suggestion,
        }));
        setError("");
      })
      .catch((requestError) => {
        if (!isCurrent) return;
        setError(
          getApiErrorMessage(
            requestError,
            "Não foi possível preparar esta avaliação social.",
          ),
        );
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [familyId]);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!familyId || !preview) {
      setError("A prévia de elegibilidade precisa estar disponível antes da decisão.");
      return;
    }

    const divergesFromSystem = formData.final_decision !== preview.system_suggestion;
    const hasOverrideReason =
      formData.decision_reason.trim() || formData.exception_reason.trim();

    if (divergesFromSystem && !hasOverrideReason) {
      setError(
        "Informe o motivo técnico quando a decisão final divergir da sugestão calculada.",
      );
      return;
    }

    if (
      formData.next_revaluation_date &&
      formData.next_revaluation_date < formData.assessment_date
    ) {
      setError("A próxima reavaliação não pode ser anterior à avaliação atual.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: FamilyAssessmentCreatePayload = {
        assessment_date: formData.assessment_date,
        final_decision: formData.final_decision,
        decision_reason: formData.decision_reason.trim() || null,
        exception_reason: formData.exception_reason.trim() || null,
        co_approved_by_user_id: null,
        next_revaluation_date: formData.next_revaluation_date || null,
        technical_notes: formData.technical_notes.trim() || null,
      };

      await api.post<FamilyAssessmentResponse>(
        `/families/${familyId}/assessments`,
        payload,
      );
      navigate(`/assessments?selected=${familyId}`, {
        state: {
          flash: {
            type: "success",
            message: "Avaliação social registrada com sucesso.",
          },
        },
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Não foi possível registrar a avaliação social.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const responsiblePerson = family?.people.find((person) => person.is_family_responsible);
  const divergesFromSystem = Boolean(
    preview && formData.final_decision !== preview.system_suggestion,
  );

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState} aria-live="polite" aria-busy="true">
          <span>Preparando cálculo e histórico da família…</span>
          <div />
          <div />
          <div />
        </div>
      </div>
    );
  }

  if (!preview || !family) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState} role="alert">
          <AlertTriangle aria-hidden="true" />
          <h1>Não foi possível iniciar a avaliação</h1>
          <p>{error || "Os dados necessários não estão disponíveis."}</p>
          <Link to="/assessments">Voltar para avaliações</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Link className={styles.backLink} to={`/assessments?selected=${family.id}`}>
          <ArrowLeft aria-hidden="true" />
          Avaliações
        </Link>
        <div className={styles.headingRow}>
          <div>
            <span className={styles.eyebrow}>
              {family.assessments.length ? "Reavaliação de aptidão" : "Primeira avaliação"}
            </span>
            <h1>Avaliar {family.internal_code}</h1>
            <p>Confirme os dados atuais, revise o cálculo e registre a decisão técnica.</p>
          </div>
          <span className={styles.draftBadge}>Decisão não registrada</span>
        </div>
      </header>

      <ol className={styles.flowGuide} aria-label="Roteiro desta avaliação">
        <li><span>1</span><div><strong>Dados atuais</strong><small>Contexto familiar</small></div></li>
        <li><span>2</span><div><strong>Cálculo</strong><small>Sugestão do sistema</small></div></li>
        <li><span>3</span><div><strong>Decisão</strong><small>Análise da liderança</small></div></li>
        <li><span>4</span><div><strong>Retorno</strong><small>Próxima reavaliação</small></div></li>
      </ol>

      <form className={styles.assessmentForm} onSubmit={handleSubmit}>
        <div className={styles.formContent}>
          <section className={styles.sectionCard} aria-labelledby="family-context-title">
            <div className={styles.sectionHeading}>
              <span>1</span>
              <div>
                <h2 id="family-context-title">Dados atuais da família</h2>
                <p>Estas informações alimentam o cálculo apresentado abaixo.</p>
              </div>
              <Link to={`/families/${family.id}/edit`}>Revisar cadastro</Link>
            </div>

            <div className={styles.familySummary}>
              <div className={styles.familyIdentity}>
                <span><UsersRound aria-hidden="true" /></span>
                <div><strong>{family.internal_code}</strong><small>{family.total_residents} moradores</small></div>
              </div>
              <dl>
                <div>
                  <dt><UserRound aria-hidden="true" />Responsável</dt>
                  <dd>{responsiblePerson?.full_name ?? family.contacts[0]?.contact_name ?? "Não informado"}</dd>
                </div>
                <div>
                  <dt><MapPin aria-hidden="true" />Localidade</dt>
                  <dd>{family.neighborhood}, {family.city} — {family.state}</dd>
                </div>
                <div>
                  <dt><CircleDollarSign aria-hidden="true" />Renda per capita</dt>
                  <dd>{formatCurrency(preview.income_per_capita)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className={styles.sectionCard} aria-labelledby="calculation-title">
            <div className={styles.sectionHeading}>
              <span>2</span>
              <div>
                <h2 id="calculation-title">Cálculo de elegibilidade</h2>
                <p>Resultado automático com os dados sociais e econômicos atuais.</p>
              </div>
              <span className={styles.readOnlyBadge}><ShieldCheck aria-hidden="true" />Calculado no servidor</span>
            </div>

            <div className={styles.calculationGrid}>
              <div className={styles.suggestionCard}>
                <span>Sugestão calculada</span>
                <strong>{formatDecision(preview.system_suggestion)}</strong>
                <p>{preview.economic_reason}</p>
              </div>
              <div className={styles.scoreCard}>
                <span>Score social</span>
                <strong>{preview.social_weight_score}</strong>
                <small>Leitura automática, sem edição manual</small>
              </div>
              <div className={styles.priorityCard}>
                <span>Prioridade</span>
                <strong>{formatPriority(preview.priority_level)}</strong>
                <small>Indicador para organizar o atendimento</small>
              </div>
            </div>

            <div className={styles.thresholds}>
              <span>Referências econômicas</span>
              <div>
                <p>Extrema pobreza <strong>{formatCurrency(preview.extreme_poverty_limit)}</strong></p>
                <p>Linha de pobreza <strong>{formatCurrency(preview.poverty_limit)}</strong></p>
                <p>Faixa atual <strong>{preview.poverty_band.replaceAll("_", " ")}</strong></p>
              </div>
            </div>

            <div className={styles.factors}>
              <span>Agravantes identificados</span>
              {preview.social_aggravating_factors.length ? (
                <ul>
                  {preview.social_aggravating_factors.map((factor) => (
                    <li key={factor}><Check aria-hidden="true" />{formatFactor(factor)}</li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum agravante social identificado com os dados atuais.</p>
              )}
            </div>
          </section>

          <section className={styles.sectionCard} aria-labelledby="decision-title">
            <div className={styles.sectionHeading}>
              <span>3</span>
              <div>
                <h2 id="decision-title">Decisão técnica</h2>
                <p>A sugestão apoia a análise, mas não substitui a decisão da liderança.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Data da avaliação <b>*</b></span>
                <input
                  type="date"
                  name="assessment_date"
                  value={formData.assessment_date}
                  onChange={handleInputChange}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Decisão final <b>*</b></span>
                <select
                  name="final_decision"
                  value={formData.final_decision}
                  onChange={handleInputChange}
                  required
                >
                  {decisionOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Fundamentação da decisão {divergesFromSystem ? <b>*</b> : null}</span>
                <textarea
                  name="decision_reason"
                  value={formData.decision_reason}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Registre os elementos sociais considerados nesta decisão."
                  required={divergesFromSystem}
                />
                <small>Obrigatória quando a decisão divergir da sugestão calculada.</small>
              </label>

              {divergesFromSystem ? (
                <div className={`${styles.divergenceNotice} ${styles.fieldWide}`}>
                  <AlertTriangle aria-hidden="true" />
                  <div>
                    <strong>Decisão diferente do cálculo</strong>
                    <span>Explique a exceção para que o histórico preserve a justificativa técnica.</span>
                  </div>
                </div>
              ) : null}

              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Motivo de exceção</span>
                <textarea
                  name="exception_reason"
                  value={formData.exception_reason}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Use quando houver uma condição excepcional relevante."
                />
              </label>
            </div>
          </section>

          <section className={styles.sectionCard} aria-labelledby="return-title">
            <div className={styles.sectionHeading}>
              <span>4</span>
              <div>
                <h2 id="return-title">Próxima reavaliação</h2>
                <p>Defina quando a aptidão deverá voltar para análise.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Data da próxima reavaliação</span>
                <input
                  type="date"
                  name="next_revaluation_date"
                  min={formData.assessment_date}
                  value={formData.next_revaluation_date}
                  onChange={handleInputChange}
                />
                <small>Sem uma data, a família retornará à fila como prazo não definido.</small>
              </label>

              <div className={styles.returnExplanation}>
                <CalendarClock aria-hidden="true" />
                <p><strong>A fila é automática.</strong> Na data definida, a família volta para revisão sem alterar a decisão registrada.</p>
              </div>

              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Observações técnicas</span>
                <textarea
                  name="technical_notes"
                  value={formData.technical_notes}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Inclua orientações para o próximo atendimento, se necessário."
                />
              </label>
            </div>
          </section>
        </div>

        <aside className={styles.reviewPanel} aria-label="Resumo da decisão">
          <span className={styles.reviewEyebrow}>Antes de registrar</span>
          <h2>Resumo da decisão</h2>

          <dl className={styles.reviewSummary}>
            <div><dt>Família</dt><dd>{family.internal_code}</dd></div>
            <div><dt>Sugestão calculada</dt><dd>{formatDecision(preview.system_suggestion)}</dd></div>
            <div><dt>Decisão técnica</dt><dd>{formatDecision(formData.final_decision)}</dd></div>
            <div><dt>Próxima revisão</dt><dd>{formData.next_revaluation_date ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${formData.next_revaluation_date}T12:00:00`)) : "Prazo não definido"}</dd></div>
          </dl>

          <div className={styles.ownershipNotice}>
            <ShieldCheck aria-hidden="true" />
            <p>O score será recalculado e gravado pelo servidor. A interface não permite alteração manual.</p>
          </div>

          {error ? <p className={styles.formError} role="alert" aria-live="polite">{error}</p> : null}

          <div className={styles.formActions}>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Registrando…" : "Registrar avaliação"}
              {!isSubmitting ? <ChevronRight aria-hidden="true" /> : null}
            </button>
            <Link to={`/assessments?selected=${family.id}`}>Cancelar e voltar</Link>
          </div>

          <p className={styles.auditNote}>A decisão, o responsável e o cálculo ficam preservados no histórico da família.</p>
        </aside>
      </form>
    </div>
  );
}
