import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { getApiErrorMessage } from "../utils/api-error";
import { formatCurrency, formatDateOnly } from "../utils/format";
import type {
  EligibilityPreviewResponse,
  FamilyAssessmentResponse,
  FamilyDetailResponse,
} from "../types/family";

const familyStatusLabels: Record<string, string> = {
  apta_recorrente: "Apta recorrente",
  apta_emergencial: "Apta emergencial",
  em_analise: "Em analise",
  inapta: "Inapta",
  inativa: "Inativa",
};

const priorityLabels: Record<string, string> = {
  alta: "Alta",
  media: "Media",
  baixa: "Baixa",
};

function formatFamilyStatus(status: string | null | undefined): string {
  if (!status) {
    return "Nao informado";
  }

  return familyStatusLabels[status] ?? status;
}

function formatPriority(priority: string | null | undefined): string {
  if (!priority) {
    return "Nao informado";
  }

  return priorityLabels[priority] ?? priority;
}

function getLatestAssessment(
  assessments: FamilyAssessmentResponse[]
): FamilyAssessmentResponse | null {
  return [...assessments].sort((first, second) => {
    const dateDiff =
      new Date(second.assessment_date).getTime() -
      new Date(first.assessment_date).getTime();

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return second.id - first.id;
  })[0] ?? null;
}

export function FamilyDetailPage() {
  const { familyId } = useParams();

  return (
    <FamilyDetailContent
      key={familyId ?? "family-missing"}
      familyId={familyId}
    />
  );
}

function FamilyDetailContent({ familyId }: { familyId: string | undefined }) {
  const [family, setFamily] = useState<FamilyDetailResponse | null>(null);
  const [eligibilityPreview, setEligibilityPreview] =
    useState<EligibilityPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusForm, setStatusForm] = useState({
    status: "em_analise",
    internal_notes: "",
  });

  useEffect(() => {
    if (!familyId) {
      return;
    }

    let isCurrent = true;

    void Promise.allSettled([
      api.get<FamilyDetailResponse>(`/families/${familyId}`),
      api.get<EligibilityPreviewResponse>(
        `/families/${familyId}/eligibility-preview`
      ),
    ])
      .then(([familyResult, previewResult]) => {
        if (!isCurrent) {
          return;
        }

        if (familyResult.status === "rejected") {
          throw familyResult.reason;
        }

        setFamily(familyResult.value.data);
        setEligibilityPreview(
          previewResult.status === "fulfilled" ? previewResult.value.data : null
        );
        setStatusForm({
          status: familyResult.value.data.status,
          internal_notes: familyResult.value.data.internal_notes ?? "",
        });
      })
      .catch((err) => {
        if (isCurrent) {
          setError(
            getApiErrorMessage(
              err,
              "Nao foi possivel carregar o detalhe da familia."
            )
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
  }, [familyId]);

  async function handleStatusSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!familyId) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setError("");
      setStatusMessage("");

      const response = await api.patch<FamilyDetailResponse>(
        `/families/${familyId}/status`,
        {
          status: statusForm.status,
          internal_notes: statusForm.internal_notes.trim() || null,
        }
      );

      setFamily(response.data);
      setStatusForm({
        status: response.data.status,
        internal_notes: response.data.internal_notes ?? "",
      });
      setStatusMessage("Status atualizado com auditoria registrada.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel atualizar o status."));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const formattedAddress = useMemo(() => {
    if (!family) {
      return "";
    }

    return `${family.street}, ${family.number} - ${family.neighborhood}, ${family.city}/${family.state}`;
  }, [family]);

  const latestAssessment = useMemo(() => {
    if (!family) {
      return null;
    }

    return getLatestAssessment(family.assessments);
  }, [family]);

  if (isLoading) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <p className="empty-state">Carregando detalhe da familia...</p>
        </div>
      </div>
    );
  }

  if (error || !family) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <p className="status-error" role="alert" aria-live="polite">
            {error || "Nao foi possivel carregar a familia."}
          </p>
          <div className="panel-actions">
            <Link to="/families" className="button button--secondary">
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
          <p className="eyebrow">Detalhe da familia</p>
          <h2>{family.internal_code}</h2>
          <p className="hero-card__description">{formattedAddress}</p>
        </div>

        <div className="hero-badges">
          <span className="hero-badge">
            Status: {formatFamilyStatus(family.status)}
          </span>
          <span className="hero-badge">
            Renda per capita: {formatCurrency(family.income_per_capita)}
          </span>
          {eligibilityPreview ? (
            <span className="hero-badge">
              Sugestao: {formatFamilyStatus(eligibilityPreview.system_suggestion)}
            </span>
          ) : null}
          <Link
            to={`/families/${family.id}/edit#vinculo-igreja`}
            className="button button--secondary button--link"
          >
            Igreja/UPG
          </Link>
          <Link
            to={`/families/${family.id}/edit`}
            className="button button--secondary button--link"
          >
            Editar cadastro
          </Link>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-card__header panel-card__header--actions">
          <div>
            <p className="eyebrow">Decisao social</p>
            <h3>Sugestao do sistema e decisao da lideranca</h3>
          </div>

          <Link
            to={`/families/${family.id}/assessments/new`}
            className="button button--secondary button--link"
          >
            Registrar avaliacao
          </Link>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <span>Status atual</span>
            <strong>{formatFamilyStatus(family.status)}</strong>
          </div>
          <div className="detail-item">
            <span>Sugestao automatica</span>
            <strong>
              {eligibilityPreview
                ? formatFamilyStatus(eligibilityPreview.system_suggestion)
                : "Nao calculada"}
            </strong>
          </div>
          <div className="detail-item">
            <span>Prioridade social</span>
            <strong>
              {eligibilityPreview
                ? formatPriority(eligibilityPreview.priority_level)
                : "Nao informada"}
            </strong>
          </div>
          <div className="detail-item">
            <span>Ultima decisao registrada</span>
            <strong>
              {latestAssessment
                ? formatFamilyStatus(latestAssessment.final_decision)
                : "Sem avaliacao"}
            </strong>
          </div>
          <div className="detail-item">
            <span>Renda total</span>
            <strong>{formatCurrency(family.monthly_income_total)}</strong>
          </div>
          <div className="detail-item">
            <span>Renda per capita</span>
            <strong>{formatCurrency(family.income_per_capita)}</strong>
          </div>
          <div className="detail-item form__group--wide">
            <span>Leitura do sistema</span>
            <strong>
              {eligibilityPreview?.economic_reason ??
                "Registre uma avaliacao para consolidar a decisao social."}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <form onSubmit={handleStatusSubmit} className="form-panel">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Gestao do cadastro</p>
              <h3>Status e inativacao</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="form__group">
              <span>Status</span>
              <select
                value={statusForm.status}
                onChange={(event) =>
                  setStatusForm((previous) => ({
                    ...previous,
                    status: event.target.value,
                  }))
                }
              >
                <option value="apta_recorrente">Apta recorrente</option>
                <option value="apta_emergencial">Apta emergencial</option>
                <option value="em_analise">Em analise</option>
                <option value="inapta">Inapta</option>
                <option value="inativa">Inativa</option>
              </select>
            </label>

            <label className="form__group form__group--wide">
              <span>Observacao interna</span>
              <textarea
                value={statusForm.internal_notes}
                onChange={(event) =>
                  setStatusForm((previous) => ({
                    ...previous,
                    internal_notes: event.target.value,
                  }))
                }
                rows={3}
              />
            </label>
          </div>

          {statusMessage ? (
            <p className="status-success" role="status" aria-live="polite">
              {statusMessage}
            </p>
          ) : null}

          <div className="panel-actions">
            <button
              type="submit"
              className="button"
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? "Atualizando..." : "Salvar status"}
            </button>
          </div>
        </form>
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Resumo</p>
              <h3>Dados gerais</h3>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span>Moradores</span>
              <strong>{family.total_residents}</strong>
            </div>
            <div className="detail-item">
              <span>Adultos</span>
              <strong>{family.total_adults}</strong>
            </div>
            <div className="detail-item">
              <span>Criancas</span>
              <strong>{family.total_children}</strong>
            </div>
            <div className="detail-item">
              <span>Idosos</span>
              <strong>{family.total_elderly}</strong>
            </div>
            <div className="detail-item">
              <span>Bebes</span>
              <strong>{family.total_babies}</strong>
            </div>
            <div className="detail-item">
              <span>Renda mensal</span>
              <strong>{formatCurrency(family.monthly_income_total)}</strong>
            </div>
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Contatos</p>
              <h3>Contatos da familia</h3>
            </div>
          </div>

          {family.contacts.length === 0 ? (
            <p className="empty-state">Nenhum contato cadastrado.</p>
          ) : (
            <div className="stack-list">
              {family.contacts.map((contact) => (
                <div key={contact.id} className="stack-item">
                  <div>
                    <strong>{contact.contact_name ?? "Sem nome"}</strong>
                    <p className="stack-item__muted">
                      {contact.phone ?? "Sem telefone"} • {contact.contact_type}
                    </p>
                  </div>

                  {contact.is_whatsapp ? (
                    <span className="pill pill--primary">WhatsApp</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <div className="panel-card__header panel-card__header--actions">
            <div>
              <p className="eyebrow">Perfil social</p>
              <h3>Igreja e vinculo comunitario</h3>
            </div>

            <Link
              to={`/families/${family.id}/edit#vinculo-igreja`}
              className="button button--secondary button--small button--link"
            >
              Editar vinculo
            </Link>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span>Frequenta igreja/UPG</span>
              <strong>{family.attends_church ? "Sim" : "Nao"}</strong>
            </div>
            <div className="detail-item">
              <span>Igreja ou UPG</span>
              <strong>{family.church_name || "Nao informado"}</strong>
            </div>
            <div className="detail-item">
              <span>O que faz ou vinculo</span>
              <strong>{family.community_relationship || "Nao informado"}</strong>
            </div>
            <div className="detail-item">
              <span>Escolaridade do responsavel</span>
              <strong>
                {family.responsible_education_level || "Nao informado"}
              </strong>
            </div>
            <div className="detail-item">
              <span>Acesso a internet</span>
              <strong>{family.has_internet_access ? "Sim" : "Nao"}</strong>
            </div>
            <div className="detail-item">
              <span>Celular disponivel</span>
              <strong>{family.has_mobile_phone ? "Sim" : "Nao"}</strong>
            </div>
            <div className="detail-item">
              <span>Computador</span>
              <strong>{family.has_computer ? "Sim" : "Nao"}</strong>
            </div>
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-card__header panel-card__header--actions">
            <div>
              <p className="eyebrow">Pessoas</p>
              <h3>Composicao familiar</h3>
            </div>

            <Link
              to={`/families/${family.id}/people/new`}
              className="button button--link"
            >
              Novo membro
            </Link>
          </div>

          {family.people.length === 0 ? (
            <p className="empty-state">Nenhuma pessoa cadastrada.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Parentesco</th>
                    <th>Ocupacao</th>
                    <th>Renda</th>
                    <th>Igreja/UPG</th>
                    <th>Responsavel</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {family.people.map((person) => (
                    <tr key={person.id}>
                      <td>{person.full_name}</td>
                      <td>{person.kinship}</td>
                      <td>{person.occupation ?? "Nao informado"}</td>
                      <td>{formatCurrency(person.individual_income)}</td>
                      <td>
                        {person.attends_church
                          ? person.church_role || person.church_name || "Sim"
                          : "Nao informado"}
                      </td>
                      <td>{person.is_family_responsible ? "Sim" : "Nao"}</td>
                      <td>
                        <div className="table-actions">
                          <Link
                            to={`/families/${family.id}/people/${person.id}/edit`}
                            className="button button--secondary button--small"
                          >
                            Editar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="content-grid">
        <article className="panel-card">
          <div className="panel-card__header panel-card__header--actions">
            <div>
              <p className="eyebrow">Beneficios</p>
              <h3>Beneficios vinculados</h3>
            </div>

            <Link
              to={`/families/${family.id}/benefits/new`}
              className="button button--secondary button--link"
            >
              Novo beneficio
            </Link>
          </div>

          {family.benefits.length === 0 ? (
            <p className="empty-state">Nenhum beneficio cadastrado.</p>
          ) : (
            <div className="stack-list">
              {family.benefits.map((benefit) => (
                <div key={benefit.id} className="stack-item">
                  <div>
                    <strong>{benefit.benefit_type}</strong>
                    <p className="stack-item__muted">
                      {benefit.is_active ? "Ativo" : "Inativo"} •{" "}
                      {benefit.counts_as_income
                        ? "Conta como renda"
                        : "Nao conta como renda"}
                    </p>
                  </div>

                  <div className="stack-item__actions">
                    <span className="pill">
                      {formatCurrency(benefit.monthly_amount)}
                    </span>
                    <Link
                      to={`/families/${family.id}/benefits/${benefit.id}/edit`}
                      className="button button--secondary button--small"
                    >
                      Editar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel-card">
          <div className="panel-card__header panel-card__header--actions">
            <div>
              <p className="eyebrow">Avaliacoes</p>
              <h3>Historico social</h3>
            </div>

            <Link
              to={`/families/${family.id}/assessments/new`}
              className="button button--secondary button--link"
            >
              Nova avaliacao
            </Link>
          </div>

          {family.assessments.length === 0 ? (
            <p className="empty-state">Nenhuma avaliacao registrada.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Sugestao</th>
                    <th>Decisao final</th>
                    <th>Pontuacao</th>
                  </tr>
                </thead>
                <tbody>
                  {family.assessments.map((assessment) => (
                    <tr key={assessment.id}>
                      <td>
                        {formatDateOnly(assessment.assessment_date)}
                      </td>
                      <td>{formatFamilyStatus(assessment.system_suggestion)}</td>
                      <td>{formatFamilyStatus(assessment.final_decision)}</td>
                      <td>{assessment.vulnerability_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <div className="panel-actions">
        <Link to="/families" className="button button--secondary">
          Voltar para familias
        </Link>
      </div>
    </div>
  );
}
