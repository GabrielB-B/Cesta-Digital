import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { CurrencyInput } from "../components/CurrencyInput";
import { FormActions } from "../components/FormActions";
import { FormSection } from "../components/FormSection";
import { PageHeader } from "../components/PageHeader";
import { StateMessage } from "../components/StateMessage";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDecimalInputValue } from "../utils/format";
import type { FamilyPersonCreatePayload, FamilyPersonResponse } from "../types/family";

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
      navigate(`/families/${familyId}`, {
        state: {
          flash: {
            type: "success",
            message: "Membro da família cadastrado com sucesso.",
          },
        },
      });
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Nao foi possivel cadastrar o membro da familia.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Composicao familiar"
        title="Novo membro"
        description="Cadastre individualmente os membros da familia para enriquecer o perfil social."
      />

      <form onSubmit={handleSubmit} className="panel-card form-panel">
        <FormSection eyebrow="Pessoa" title="Dados individuais">
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
              placeholder="Ex.: responsavel, filho, avo..."
              required
            />
          </label>

          <label className="form__group">
            <span>Genero</span>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
            >
              <option value="">Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
              <option value="nao_informado">Nao informado</option>
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
              <option value="nao_informado">Nao informado</option>
              <option value="fundamental_incompleto">Fundamental incompleto</option>
              <option value="fundamental_completo">Fundamental completo</option>
              <option value="medio_incompleto">Medio incompleto</option>
              <option value="medio_completo">Medio completo</option>
              <option value="superior_incompleto">Superior incompleto</option>
              <option value="superior_completo">Superior completo</option>
            </select>
          </label>

          <label className="form__group">
            <span>Ocupacao</span>
            <input
              name="occupation"
              value={formData.occupation}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Renda individual</span>
            <CurrencyInput
              name="individual_income"
              value={formData.individual_income}
              onChange={handleInputChange}
              onBlur={handleCurrencyBlur}
            />
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
        </FormSection>

        <FormSection
          eyebrow="Condicao"
          title="Situacao individual"
          gridClassName="checkbox-grid"
        >
          <label className="checkbox-card">
            <input
              type="checkbox"
              name="is_currently_studying"
              checked={formData.is_currently_studying}
              onChange={handleInputChange}
            />
            <span>Esta estudando</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="is_currently_working"
              checked={formData.is_currently_working}
              onChange={handleInputChange}
            />
            <span>Esta trabalhando</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="is_family_responsible"
              checked={formData.is_family_responsible}
              onChange={handleInputChange}
            />
            <span>Responsavel familiar</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_disability"
              checked={formData.has_disability}
              onChange={handleInputChange}
            />
            <span>Pessoa com deficiencia</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_chronic_illness"
              checked={formData.has_chronic_illness}
              onChange={handleInputChange}
            />
            <span>Doenca cronica</span>
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
        </FormSection>

        {error ? (
          <StateMessage variant="error">{error}</StateMessage>
        ) : null}

        <FormActions>
          <Link
            to={`/families/${familyId}`}
            className="button button--secondary button--link"
          >
            Cancelar
          </Link>

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Cadastrar membro"}
          </button>
        </FormActions>
      </form>
    </div>
  );
}
