import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { getApiErrorMessage } from "../utils/api-error";
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
          <p className="empty-state">Carregando membro da familia...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.full_name) {
    return (
      <div className="page-stack">
        <div className="panel-card">
          <p className="status-error" role="alert" aria-live="polite">
            {error}
          </p>
          <div className="panel-actions">
            <Link to={`/families/${familyId}`} className="button button--secondary">
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
          <p className="eyebrow">Composicao familiar</p>
          <h2>Editar membro</h2>
          <p className="hero-card__description">
            Atualize os dados do membro e mantenha o resumo social coerente com a realidade.
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
            <span>Observacoes</span>
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
            <p className="eyebrow">Condicao</p>
            <h3>Situacao individual</h3>
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
        </div>

        {error ? (
          <p className="status-error" role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}

        <div className="panel-actions panel-actions--spread">
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
        </div>
      </form>
    </div>
  );
}
