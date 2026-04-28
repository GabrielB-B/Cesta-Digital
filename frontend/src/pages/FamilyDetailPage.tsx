import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { getApiErrorMessage } from "../utils/api-error";
import type { FamilyDetailResponse } from "../types/family";

export function FamilyDetailPage() {
  const { familyId } = useParams();
  const [family, setFamily] = useState<FamilyDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFamilyDetail() {
      try {
        setIsLoading(true);
        setError("");

        const response = await api.get<FamilyDetailResponse>(
          `/families/${familyId}`
        );

        if (isMounted) {
          setFamily(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            getApiErrorMessage(err, "Nao foi possivel carregar o detalhe da familia.")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (familyId) {
      void loadFamilyDetail();
    }

    return () => {
      isMounted = false;
    };
  }, [familyId]);

  const formattedAddress = useMemo(() => {
    if (!family) {
      return "";
    }

    return `${family.street}, ${family.number} - ${family.neighborhood}, ${family.city}/${family.state}`;
  }, [family]);

  function formatCurrency(value: string): string {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

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
          <p className="status-error">
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
          <span className="hero-badge">Status: {family.status}</span>
          <span className="hero-badge">
            Renda per capita: {formatCurrency(family.income_per_capita)}
          </span>
        </div>
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
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Perfil social</p>
              <h3>Vinculo comunitario e acesso</h3>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span>Frequenta igreja</span>
              <strong>{family.attends_church ? "Sim" : "Nao"}</strong>
            </div>
            <div className="detail-item">
              <span>Igreja</span>
              <strong>{family.church_name || "Nao informado"}</strong>
            </div>
            <div className="detail-item">
              <span>Relacao com a comunidade</span>
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
                        {new Date(assessment.assessment_date).toLocaleDateString(
                          "pt-BR"
                        )}
                      </td>
                      <td>{assessment.system_suggestion}</td>
                      <td>{assessment.final_decision}</td>
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
