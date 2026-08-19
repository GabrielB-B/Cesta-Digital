import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  Edit3,
  HeartHandshake,
  Home,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  EligibilityPreviewResponse,
  FamilyAssessmentResponse,
  FamilyDetailResponse,
} from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";
import { formatCurrency, formatDateOnly } from "../utils/format";
import styles from "./FamilyDetailPage.module.css";

const familyStatusLabels: Record<string, string> = {
  apta_recorrente: "Apta recorrente",
  apta_emergencial: "Apta emergencial",
  em_analise: "Em análise",
  inapta: "Inapta",
  inativa: "Inativa",
};

const priorityLabels: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

function formatFamilyStatus(status: string | null | undefined): string {
  if (!status) return "Não informado";
  return familyStatusLabels[status] ?? status;
}

function formatPriority(priority: string | null | undefined): string {
  if (!priority) return "Não informada";
  return priorityLabels[priority] ?? priority;
}

function getStatusTone(status: string): string {
  if (status === "apta_recorrente") return styles.statusSuccess;
  if (status === "apta_emergencial") return styles.statusInfo;
  if (status === "em_analise") return styles.statusWarning;
  return styles.statusInactive;
}

function getLatestAssessment(
  assessments: FamilyAssessmentResponse[],
): FamilyAssessmentResponse | null {
  return [...assessments].sort((first, second) => {
    const dateDifference =
      new Date(second.assessment_date).getTime() -
      new Date(first.assessment_date).getTime();
    return dateDifference || second.id - first.id;
  })[0] ?? null;
}

export function FamilyDetailPage() {
  const { familyId } = useParams();
  return <FamilyDetailContent key={familyId ?? "family-missing"} familyId={familyId} />;
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
    if (!familyId) return;
    let isCurrent = true;

    void Promise.allSettled([
      api.get<FamilyDetailResponse>(`/families/${familyId}`),
      api.get<EligibilityPreviewResponse>(
        `/families/${familyId}/eligibility-preview`,
      ),
    ])
      .then(([familyResult, previewResult]) => {
        if (!isCurrent) return;
        if (familyResult.status === "rejected") throw familyResult.reason;

        setFamily(familyResult.value.data);
        setEligibilityPreview(
          previewResult.status === "fulfilled" ? previewResult.value.data : null,
        );
        setStatusForm({
          status: familyResult.value.data.status,
          internal_notes: familyResult.value.data.internal_notes ?? "",
        });
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(
            getApiErrorMessage(
              requestError,
              "Não foi possível carregar o detalhe da família.",
            ),
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [familyId]);

  async function handleStatusSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!familyId) return;

    try {
      setIsUpdatingStatus(true);
      setError("");
      setStatusMessage("");
      const response = await api.patch<FamilyDetailResponse>(
        `/families/${familyId}/status`,
        {
          status: statusForm.status,
          internal_notes: statusForm.internal_notes.trim() || null,
        },
      );
      setFamily(response.data);
      setStatusForm({
        status: response.data.status,
        internal_notes: response.data.internal_notes ?? "",
      });
      setStatusMessage("Status atualizado com auditoria registrada.");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Não foi possível atualizar o status."),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const formattedAddress = useMemo(() => {
    if (!family) return "";
    return `${family.street}, ${family.number} · ${family.neighborhood}, ${family.city}/${family.state}`;
  }, [family]);

  const latestAssessment = useMemo(
    () => (family ? getLatestAssessment(family.assessments) : null),
    [family],
  );

  const responsiblePerson = family?.people.find((person) => person.is_family_responsible);
  const primaryContact = family?.contacts[0];

  if (isLoading) {
    return (
      <div className={styles.loadingPage} aria-busy="true" aria-live="polite">
        <span>Carregando cadastro da família…</span>
        <div className={styles.loadingHeader} />
        <div className={styles.loadingContent} />
      </div>
    );
  }

  if (!family) {
    return (
      <section className={styles.errorState} role="alert">
        <h1>Não foi possível abrir a família</h1>
        <p>{error || "O cadastro solicitado não está disponível."}</p>
        <Link to="/families"><ArrowLeft aria-hidden="true" />Voltar para famílias</Link>
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.detailHeader}>
        <Link className={styles.backLink} to="/families">
          <ArrowLeft aria-hidden="true" />
          Famílias
        </Link>
        <div className={styles.headerRow}>
          <div className={styles.headerIdentity}>
            <span className={styles.familyIcon}><UsersRound aria-hidden="true" /></span>
            <div>
              <span className={`${styles.statusBadge} ${getStatusTone(family.status)}`}>
                {formatFamilyStatus(family.status)}
              </span>
              <h1>{family.internal_code}</h1>
              <p><MapPin aria-hidden="true" />{formattedAddress}</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Link className={styles.secondaryAction} to={`/families/${family.id}/edit#vinculo-igreja`}>
              <HeartHandshake aria-hidden="true" />Igreja/UPG
            </Link>
            <Link className={styles.secondaryAction} to={`/families/${family.id}/edit`}>
              <Edit3 aria-hidden="true" />Editar cadastro
            </Link>
            <Link className={styles.primaryAction} to={`/families/${family.id}/assessments/new`}>
              <Plus aria-hidden="true" />Registrar avaliação
            </Link>
          </div>
        </div>
      </header>

      <nav className={styles.sectionNav} aria-label="Seções da família">
        <a href="#decisao">Aptidão</a>
        <a href="#resumo">Resumo</a>
        <a href="#composicao">Composição</a>
        <a href="#beneficios">Benefícios</a>
        <a href="#avaliacoes">Avaliações</a>
      </nav>

      <div className={styles.detailLayout}>
        <aside className={styles.summaryCard} aria-label="Resumo da família">
          <h2>Resumo do cadastro</h2>
          <dl>
            <div>
              <dt><UserRound aria-hidden="true" />Pessoa responsável</dt>
              <dd>{responsiblePerson?.full_name ?? "Não informada"}</dd>
            </div>
            <div>
              <dt><Phone aria-hidden="true" />Contato principal</dt>
              <dd>{primaryContact?.contact_name ?? "Não informado"}</dd>
              {primaryContact?.phone ? <dd className={styles.mutedValue}>{primaryContact.phone}</dd> : null}
            </div>
            <div>
              <dt><UsersRound aria-hidden="true" />Moradores</dt>
              <dd>{family.total_residents} pessoas</dd>
            </div>
            <div>
              <dt><WalletCards aria-hidden="true" />Renda per capita</dt>
              <dd>{formatCurrency(family.income_per_capita)}</dd>
            </div>
            <div>
              <dt><CalendarDays aria-hidden="true" />Próxima reavaliação</dt>
              <dd>{family.next_revaluation_date ? formatDateOnly(family.next_revaluation_date) : "Não agendada"}</dd>
            </div>
            <div>
              <dt><Home aria-hidden="true" />Moradia</dt>
              <dd>{family.housing_type || "Não informada"}</dd>
            </div>
          </dl>
        </aside>

        <main className={styles.content}>
          <section id="decisao" className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Aptidão ao atendimento</span>
                <h2>Sugestão do sistema e decisão da liderança</h2>
                <p>O cálculo orienta a análise; a decisão técnica permanece registrada separadamente.</p>
              </div>
              <ShieldCheck aria-hidden="true" />
            </div>

            <div className={styles.decisionGrid}>
              <div>
                <span>Sugestão calculada</span>
                <strong>{eligibilityPreview ? formatFamilyStatus(eligibilityPreview.system_suggestion) : "Não calculada"}</strong>
              </div>
              <div>
                <span>Última decisão registrada</span>
                <strong>{latestAssessment ? formatFamilyStatus(latestAssessment.final_decision) : "Sem avaliação"}</strong>
              </div>
              <div>
                <span>Prioridade social</span>
                <strong>{formatPriority(eligibilityPreview?.priority_level)}</strong>
              </div>
            </div>

            <div className={styles.systemReading}>
              <ClipboardCheck aria-hidden="true" />
              <div>
                <strong>Sugestão: {eligibilityPreview ? formatFamilyStatus(eligibilityPreview.system_suggestion) : "Não calculada"}</strong>
                <p>{eligibilityPreview?.economic_reason ?? "Registre uma avaliação para consolidar a leitura social."}</p>
              </div>
            </div>
          </section>

          <section id="resumo" className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.eyebrow}>Resumo</span><h2>Condições gerais</h2></div>
            </div>
            <dl className={styles.factGrid}>
              <div><dt>Renda mensal</dt><dd>{formatCurrency(family.monthly_income_total)}</dd></div>
              <div><dt>Despesas essenciais</dt><dd>{formatCurrency(family.monthly_essential_expenses)}</dd></div>
              <div><dt>Adultos</dt><dd>{family.total_adults}</dd></div>
              <div><dt>Crianças</dt><dd>{family.total_children}</dd></div>
              <div><dt>Idosos</dt><dd>{family.total_elderly}</dd></div>
              <div><dt>Bebês</dt><dd>{family.total_babies}</dd></div>
              <div><dt>Água</dt><dd>{family.has_water_supply ? "Disponível" : "Indisponível"}</dd></div>
              <div><dt>Saneamento</dt><dd>{family.has_sanitation ? "Disponível" : "Indisponível"}</dd></div>
            </dl>
          </section>

          <section id="composicao" className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.eyebrow}>Pessoas</span><h2>Composição familiar</h2></div>
              <Link className={styles.textAction} to={`/families/${family.id}/people/new`}><Plus aria-hidden="true" />Novo membro</Link>
            </div>
            {family.people.length === 0 ? (
              <p className={styles.emptyState}>Nenhuma pessoa cadastrada.</p>
            ) : (
              <div className={styles.peopleList}>
                {family.people.map((person) => (
                  <div key={person.id} className={styles.personRow}>
                    <span className={styles.personAvatar} aria-hidden="true">{person.full_name.charAt(0)}</span>
                    <span className={styles.personIdentity}>
                      <strong>{person.full_name}</strong>
                      <span>{person.kinship} · {person.occupation ?? "Ocupação não informada"}</span>
                    </span>
                    <span className={styles.personIncome}>{formatCurrency(person.individual_income)}</span>
                    {person.is_family_responsible ? <span className={styles.responsibleBadge}>Responsável</span> : null}
                    <Link to={`/families/${family.id}/people/${person.id}/edit`}>Editar</Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.splitSection}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div><span className={styles.eyebrow}>Contatos</span><h2>Comunicação</h2></div>
              </div>
              {family.contacts.length === 0 ? <p className={styles.emptyState}>Nenhum contato cadastrado.</p> : (
                <div className={styles.simpleList}>
                  {family.contacts.map((contact) => (
                    <div key={contact.id}>
                      <span><strong>{contact.contact_name ?? "Sem nome"}</strong><small>{contact.contact_type}</small></span>
                      <span>{contact.phone ?? "Sem telefone"}{contact.is_whatsapp ? " · WhatsApp" : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div><span className={styles.eyebrow}>Vínculo comunitário</span><h2>Igreja e UPG</h2></div>
                <Link className={styles.iconAction} aria-label="Editar vínculo comunitário" to={`/families/${family.id}/edit#vinculo-igreja`}><Edit3 aria-hidden="true" /></Link>
              </div>
              <dl className={styles.compactFacts}>
                <div><dt>Frequenta</dt><dd>{family.attends_church ? "Sim" : "Não"}</dd></div>
                <div><dt>Igreja ou UPG</dt><dd>{family.church_name || "Não informada"}</dd></div>
                <div><dt>Vínculo</dt><dd>{family.community_relationship || "Não informado"}</dd></div>
              </dl>
            </article>
          </section>

          <section id="beneficios" className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.eyebrow}>Benefícios</span><h2>Benefícios vinculados</h2></div>
              <Link className={styles.textAction} to={`/families/${family.id}/benefits/new`}><Plus aria-hidden="true" />Novo benefício</Link>
            </div>
            {family.benefits.length === 0 ? <p className={styles.emptyState}>Nenhum benefício cadastrado.</p> : (
              <div className={styles.simpleList}>
                {family.benefits.map((benefit) => (
                  <div key={benefit.id}>
                    <span><strong>{benefit.benefit_type}</strong><small>{benefit.is_active ? "Ativo" : "Inativo"} · {benefit.counts_as_income ? "Conta como renda" : "Não conta como renda"}</small></span>
                    <span>{formatCurrency(benefit.monthly_amount)} <Link to={`/families/${family.id}/benefits/${benefit.id}/edit`}>Editar</Link></span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="avaliacoes" className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.eyebrow}>Avaliações</span><h2>Histórico de aptidão</h2></div>
              <Link className={styles.textAction} to={`/families/${family.id}/assessments/new`}><Plus aria-hidden="true" />Nova avaliação</Link>
            </div>
            {family.assessments.length === 0 ? <p className={styles.emptyState}>Nenhuma avaliação registrada.</p> : (
              <div className={styles.assessmentList}>
                {family.assessments.map((assessment) => (
                  <div key={assessment.id}>
                    <span className={styles.assessmentDate}>{formatDateOnly(assessment.assessment_date)}</span>
                    <span><small>Sugestão</small><strong>{formatFamilyStatus(assessment.system_suggestion)}</strong></span>
                    <span><small>Decisão final</small><strong>{formatFamilyStatus(assessment.final_decision)}</strong></span>
                    <span><small>Pontuação</small><strong>{assessment.vulnerability_score}</strong></span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <form onSubmit={handleStatusSubmit} className={styles.statusForm}>
              <div className={styles.panelHeader}>
                <div><span className={styles.eyebrow}>Gestão do cadastro</span><h2>Status e observação interna</h2><p>Status apto ou inapto exige avaliação social com a mesma decisão final.</p></div>
              </div>
              <div className={styles.formGrid}>
                <label>
                  <span>Status</span>
                  <select value={statusForm.status} onChange={(event) => setStatusForm((current) => ({ ...current, status: event.target.value }))}>
                    <option value="apta_recorrente">Apta recorrente</option>
                    <option value="apta_emergencial">Apta emergencial</option>
                    <option value="em_analise">Em análise</option>
                    <option value="inapta">Inapta</option>
                    <option value="inativa">Inativa</option>
                  </select>
                </label>
                <label>
                  <span>Observação interna</span>
                  <textarea rows={3} value={statusForm.internal_notes} onChange={(event) => setStatusForm((current) => ({ ...current, internal_notes: event.target.value }))} />
                </label>
              </div>
              {error ? <p className={styles.formError} role="alert">{error}</p> : null}
              {statusMessage ? <p className={styles.formSuccess} role="status">{statusMessage}</p> : null}
              <button className={styles.saveButton} type="submit" disabled={isUpdatingStatus}>
                {isUpdatingStatus ? "Atualizando…" : "Salvar status"}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
