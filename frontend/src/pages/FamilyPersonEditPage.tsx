import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { CurrencyInput } from "../components/CurrencyInput";
import { FormActions } from "../components/FormActions";
import { FormSection } from "../components/FormSection";
import { PageHeader } from "../components/PageHeader";
import { StateMessage } from "../components/StateMessage";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDecimalInputValue } from "../utils/format";
import type {
  FamilyDetailResponse,
  FamilyPersonResponse,
  FamilyPersonUpdatePayload,
} from "../types/family";

function buildPersonForm(person: FamilyPersonResponse) {
  return {
    full_name: person.full_name,
    birth_date: person.birth_date,
    kinship: person.kinship,
    gender: person.gender ?? "",
    phone: person.phone ?? "",
    education_level: person.education_level ?? "",
    is_currently_studying: person.is_currently_studying,
    is_currently_working: person.is_currently_working,
    occupation: person.occupation ?? "",
    individual_income: Number(person.individual_income),
    attends_church: person.attends_church,
    church_name: person.church_name ?? "",
    church_role: person.church_role ?? "",
    has_disability: person.has_disability,
    has_chronic_illness: person.has_chronic_illness,
    is_pregnant: person.is_pregnant,
    is_nursing_mother: person.is_nursing_mother,
    notes: person.notes ?? "",
    is_family_responsible: person.is_family_responsible,
  };
}

export function FamilyPersonEditPage() {
  const navigate = useNavigate();
  const { familyId, personId } = useParams();

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPerson() {
      try {
        setIsLoading(true);
        setError("");

        const response = await api.get<FamilyDetailResponse>(`/families/${familyId}`);
        const person = response.data.people.find(
          (item) => String(item.id) === personId
        );

        if (!person) {
          throw new Error("Pessoa nao encontrada");
        }

        if (isMounted) {
          setFormData(buildPersonForm(person));
        }
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, "Nao foi possivel carregar o membro."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (familyId && personId) {
      void loadPerson();
    }

    return () => {
      isMounted = false;
    };
  }, [familyId, personId]);

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

    if (!familyId || !personId) {
      setError("Pessoa ou familia nao identificada.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: FamilyPersonUpdatePayload = {
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

      await api.put(`/people/${personId}`, payload);
      navigate(`/families/${familyId}`, {
        state: {
          flash: {
            type: "success",
            message: "Membro da família atualizado com sucesso.",
          },
        },
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel atualizar o membro."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!familyId || !personId) {
      setError("Pessoa ou familia nao identificada.");
      return;
    }

    if (!window.confirm("Deseja realmente excluir este membro da familia?")) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await api.delete(`/people/${personId}`);
      navigate(`/families/${familyId}`, {
        state: {
          flash: {
            type: "success",
            message: "Membro da família excluído com sucesso.",
          },
        },
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel excluir o membro."));
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <StateMessage variant="loading">
            Carregando membro da familia...
          </StateMessage>
        </div>
      </div>
    );
  }

  if (error && !formData.full_name) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <StateMessage variant="error">{error}</StateMessage>
          <FormActions>
            <Link to={`/families/${familyId}`} className="button button--secondary">
              Voltar
            </Link>
          </FormActions>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Composicao familiar"
        title="Editar membro"
        description="Atualize os dados do membro e mantenha o resumo social coerente com a realidade."
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

        <FormActions spread>
          <button
            type="button"
            className="button button--danger"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
          >
            {isDeleting ? "Excluindo..." : "Excluir membro"}
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
        </FormActions>
      </form>
    </div>
  );
}
