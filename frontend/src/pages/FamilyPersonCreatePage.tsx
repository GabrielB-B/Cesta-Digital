import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { CurrencyInput } from "../components/CurrencyInput";
import { FieldError } from "../components/FieldError";
import { FormActions } from "../components/FormActions";
import { FormSection } from "../components/FormSection";
import { PageHeader } from "../components/PageHeader";
import { StateMessage } from "../components/StateMessage";
import { getApiErrorMessage } from "../utils/api-error";
import { focusFirstFieldError } from "../utils/form-errors";
import { formatDecimalInputValue } from "../utils/format";
import {
  confirmDiscardUnsavedChanges,
  useUnsavedChangesWarning,
} from "../utils/unsaved-changes";
import type { FamilyPersonCreatePayload, FamilyPersonResponse } from "../types/family";
import type { FieldErrors } from "../utils/form-errors";

type PersonFieldName = "full_name" | "birth_date" | "kinship";

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
    attends_church: false,
    church_name: "",
    church_role: "",
    has_disability: false,
    has_chronic_illness: false,
    is_pregnant: false,
    is_nursing_mother: false,
    notes: "",
    is_family_responsible: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<PersonFieldName>>(
    {}
  );

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = event.target as HTMLInputElement;

    if (type === "checkbox") {
      setIsDirty(true);
      setFormData((previous) => ({
        ...previous,
        [name]: (event.target as HTMLInputElement).checked,
      }));
      return;
    }

    setIsDirty(true);
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleCurrencyBlur(event: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setIsDirty(true);
    setFormData((previous) => ({
      ...previous,
      [name]: formatDecimalInputValue(value),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    if (!familyId) {
      setError("Familia nao identificada.");
      return;
    }

    const nextFieldErrors: FieldErrors<PersonFieldName> = {};
    if (!formData.full_name.trim()) {
      nextFieldErrors.full_name = "Informe o nome completo do membro.";
    }
    if (!formData.birth_date) {
      nextFieldErrors.birth_date = "Informe a data de nascimento.";
    }
    if (!formData.kinship.trim()) {
      nextFieldErrors.kinship = "Informe o parentesco com a familia.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Revise os campos destacados antes de continuar.");
      focusFirstFieldError(nextFieldErrors);
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
        attends_church: formData.attends_church,
        church_name: formData.church_name.trim() || null,
        church_role: formData.church_role.trim() || null,
        has_disability: formData.has_disability,
        has_chronic_illness: formData.has_chronic_illness,
        is_pregnant: formData.is_pregnant,
        is_nursing_mother: formData.is_nursing_mother,
        notes: formData.notes.trim() || null,
        is_family_responsible: formData.is_family_responsible,
      };

      await api.post<FamilyPersonResponse>(`/families/${familyId}/people`, payload);
      setIsDirty(false);
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

  useUnsavedChangesWarning(isDirty && !isSubmitting);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Composicao familiar"
        title="Novo membro"
        description="Cadastre individualmente os membros da familia para enriquecer o perfil social."
      />

      <form onSubmit={handleSubmit} className="panel-card form-panel" noValidate>
        <FormSection eyebrow="Pessoa" title="Dados individuais">
          <label className="form__group form__group--wide">
            <span>Nome completo</span>
            <input
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              aria-invalid={fieldErrors.full_name ? true : undefined}
              aria-describedby={
                fieldErrors.full_name ? "full_name-error" : undefined
              }
              required
            />
            <FieldError id="full_name-error" message={fieldErrors.full_name} />
          </label>

          <label className="form__group">
            <span>Data de nascimento</span>
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleInputChange}
              aria-invalid={fieldErrors.birth_date ? true : undefined}
              aria-describedby={
                fieldErrors.birth_date ? "birth_date-error" : undefined
              }
              required
            />
            <FieldError id="birth_date-error" message={fieldErrors.birth_date} />
          </label>

          <label className="form__group">
            <span>Parentesco</span>
            <input
              name="kinship"
              value={formData.kinship}
              onChange={handleInputChange}
              placeholder="Ex.: responsavel, filho, avo..."
              aria-invalid={fieldErrors.kinship ? true : undefined}
              aria-describedby={
                fieldErrors.kinship ? "kinship-error" : undefined
              }
              required
            />
            <FieldError id="kinship-error" message={fieldErrors.kinship} />
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
          eyebrow="Vinculo com igreja"
          title="Igreja, UPG e participacao do membro"
        >
          <label className="checkbox-card">
            <input
              type="checkbox"
              name="attends_church"
              checked={formData.attends_church}
              onChange={handleInputChange}
            />
            <span>Frequenta igreja ou UPG</span>
          </label>

          <label className="form__group">
            <span>Igreja ou UPG</span>
            <input
              name="church_name"
              value={formData.church_name}
              onChange={handleInputChange}
              placeholder="Ex.: Sede, congregacao, UPG..."
            />
          </label>

          <label className="form__group form__group--wide">
            <span>Cargo, funcao ou vinculo</span>
            <input
              name="church_role"
              value={formData.church_role}
              onChange={handleInputChange}
              placeholder="Ex.: membro, visitante, lider, voluntario, diacono..."
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
            onClick={(event) => {
              if (!confirmDiscardUnsavedChanges(isDirty && !isSubmitting)) {
                event.preventDefault();
              }
            }}
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
