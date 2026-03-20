import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { FamilyPersonCreatePayload, FamilyPersonResponse } from "../types/family";

/**
 * Cadastro individual de membro vinculado a uma família.
 */
export function FamilyPersonCreatePage() {
  const navigate = useNavigate();
  const { familyId } = useParams();

  const [formData, setFormData] = useState({
    full_name: "",
    birth_date: "",
    kinship: "",
    gender: "",
    phone: "",
    education_level: "",
    is_currently_studying: false,
    is_currently_working: false,
    occupation: "",
    individual_income: 0,
    has_disability: false,
    has_chronic_illness: false,
    is_pregnant: false,
    is_nursing_mother: false,
    notes: "",
    is_family_responsible: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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

    if (!familyId) {
      setError("Família não identificada.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: FamilyPersonCreatePayload = {
        full_name: formData.full_name.trim(),
        birth_date: formData.birth_date,
        kinship: formData.kinship.trim(),
        gender: formData.gender.trim() || null,
        phone: formData.phone.trim() || null,
        education_level: formData.education_level.trim() || null,
        is_currently_studying: formData.is_currently_studying,
        is_currently_working: formData.is_currently_working,
        occupation: formData.occupation.trim() || null,
        individual_income: Number(formData.individual_income),
        has_disability: formData.has_disability,
        has_chronic_illness: formData.has_chronic_illness,
        is_pregnant: formData.is_pregnant,
        is_nursing_mother: formData.is_nursing_mother,
        notes: formData.notes.trim() || null,
        is_family_responsible: formData.is_family_responsible,
      };

      await api.post<FamilyPersonResponse>(`/families/${familyId}/people`, payload);
      navigate(`/families/${familyId}`);
    } catch {
      setError("Não foi possível cadastrar o membro da família.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Composição familiar</p>
          <h2>Novo membro</h2>
          <p className="hero-card__description">
            Cadastre individualmente os membros da família para enriquecer o perfil social.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="panel-card form-panel">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Pessoa</p>
            <h3>Dados individuais</h3>
          </div>
        </div>

        <div className="form-grid">
          <label className="form__group form__group--wide">
            <span>Nome completo</span>
            <input
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="form__group">
            <span>Data de nascimento</span>
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="form__group">
            <span>Parentesco</span>
            <input
              name="kinship"
              value={formData.kinship}
              onChange={handleInputChange}
              placeholder="Ex.: responsável, filho, avó..."
              required
            />
          </label>

          <label className="form__group">
            <span>Gênero</span>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
            >
              <option value="">Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
              <option value="nao_informado">Não informado</option>
            </select>
          </label>

          <label className="form__group">
            <span>Telefone</span>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Escolaridade</span>
            <select
              name="education_level"
              value={formData.education_level}
              onChange={handleInputChange}
            >
              <option value="">Selecione</option>
              <option value="nao_informado">Não informado</option>
              <option value="fundamental_incompleto">Fundamental incompleto</option>
              <option value="fundamental_completo">Fundamental completo</option>
              <option value="medio_incompleto">Médio incompleto</option>
              <option value="medio_completo">Médio completo</option>
              <option value="superior_incompleto">Superior incompleto</option>
              <option value="superior_completo">Superior completo</option>
            </select>
          </label>

          <label className="form__group">
            <span>Ocupação</span>
            <input
              name="occupation"
              value={formData.occupation}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Renda individual</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="individual_income"
              value={formData.individual_income}
              onChange={handleInputChange}
            />
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

        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Condição</p>
            <h3>Situação individual</h3>
          </div>
        </div>

        <div className="checkbox-grid">
          <label className="checkbox-card">
            <input
              type="checkbox"
              name="is_currently_studying"
              checked={formData.is_currently_studying}
              onChange={handleInputChange}
            />
            <span>Está estudando</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="is_currently_working"
              checked={formData.is_currently_working}
              onChange={handleInputChange}
            />
            <span>Está trabalhando</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="is_family_responsible"
              checked={formData.is_family_responsible}
              onChange={handleInputChange}
            />
            <span>Responsável familiar</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_disability"
              checked={formData.has_disability}
              onChange={handleInputChange}
            />
            <span>Pessoa com deficiência</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_chronic_illness"
              checked={formData.has_chronic_illness}
              onChange={handleInputChange}
            />
            <span>Doença crônica</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="is_pregnant"
              checked={formData.is_pregnant}
              onChange={handleInputChange}
            />
            <span>Gestante</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="is_nursing_mother"
              checked={formData.is_nursing_mother}
              onChange={handleInputChange}
            />
            <span>Lactante</span>
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
            {isSubmitting ? "Salvando..." : "Cadastrar membro"}
          </button>
        </div>
      </form>
    </div>
  );
}