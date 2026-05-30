import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { CurrencyInput } from "../components/CurrencyInput";
import { FormActions } from "../components/FormActions";
import { FormSection } from "../components/FormSection";
import { PageHeader } from "../components/PageHeader";
import { StateMessage } from "../components/StateMessage";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDecimalInputValue, formatTodayForInput } from "../utils/format";
import type {
  FamilyCreatePayload,
  FamilyListItemResponse,
} from "../types/family";

/**
 * Formulário inicial de cadastro de família.
 * Mantém o payload compatível com o backend já construído.
 */
export function FamilyCreatePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    status: "em_analise",
    registration_date: formatTodayForInput(),
    monthly_income_total: 0,
    monthly_essential_expenses: 0,
    receives_government_assistance: false,
    housing_type: "",
    has_water_supply: true,
    has_electricity: true,
    has_sanitation: false,
    rooms_count: 0,
    bedrooms_count: 0,
    zip_code: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "SE",
    reference_point: "",
    total_adults: 1,
    total_children: 0,
    total_elderly: 0,
    total_babies: 0,
    has_pregnant_member: false,
    has_disabled_member: false,
    has_chronic_illness_member: false,
    has_unemployed_member: false,
    needs_extra_support: false,
    social_notes: "",
    internal_notes: "",
    contact_name: "",
    contact_phone: "",
    contact_type: "principal",
    is_whatsapp: true,
    contact_notes: "",
    attends_church: false,
    church_name: "",
    community_relationship: "",
    responsible_education_level: "",
    has_internet_access: false,
    has_mobile_phone: false,
    has_computer: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalResidents = useMemo(() => {
    return (
      Number(formData.total_adults) +
      Number(formData.total_children) +
      Number(formData.total_elderly) +
      Number(formData.total_babies)
    );
  }, [
    formData.total_adults,
    formData.total_children,
    formData.total_elderly,
    formData.total_babies,
  ]);

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

    if (totalResidents < 1) {
      setError("A família precisa ter pelo menos 1 morador.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: FamilyCreatePayload = {
        status: formData.status,
        registration_date: formData.registration_date,
        last_evaluation_date: null,
        next_revaluation_date: null,
        monthly_income_total: Number(formData.monthly_income_total),
        monthly_essential_expenses: Number(formData.monthly_essential_expenses),
        income_per_capita:
          totalResidents > 0
            ? Number(formData.monthly_income_total) / totalResidents
            : 0,
        receives_government_assistance:
          formData.receives_government_assistance,
        housing_type: formData.housing_type.trim() || null,
        has_water_supply: formData.has_water_supply,
        has_electricity: formData.has_electricity,
        has_sanitation: formData.has_sanitation,
        rooms_count: Number(formData.rooms_count),
        bedrooms_count: Number(formData.bedrooms_count),
        zip_code: formData.zip_code.trim() || null,
        street: formData.street.trim(),
        number: formData.number.trim(),
        complement: formData.complement.trim() || null,
        neighborhood: formData.neighborhood.trim(),
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase(),
        reference_point: formData.reference_point.trim() || null,
        total_residents: totalResidents,
        total_adults: Number(formData.total_adults),
        total_children: Number(formData.total_children),
        total_elderly: Number(formData.total_elderly),
        total_babies: Number(formData.total_babies),
        has_pregnant_member: formData.has_pregnant_member,
        has_disabled_member: formData.has_disabled_member,
        has_chronic_illness_member: formData.has_chronic_illness_member,
        has_unemployed_member: formData.has_unemployed_member,
        needs_extra_support: formData.needs_extra_support,
        social_notes: formData.social_notes.trim() || null,
        internal_notes: formData.internal_notes.trim() || null,
        contacts:
          formData.contact_name.trim() || formData.contact_phone.trim()
            ? [
                {
                  contact_name: formData.contact_name.trim() || null,
                  phone: formData.contact_phone.trim() || null,
                  contact_type: formData.contact_type,
                  is_whatsapp: formData.is_whatsapp,
                  notes: formData.contact_notes.trim() || null,
                },
              ]
            : [],
        attends_church: formData.attends_church,
        church_name: formData.church_name.trim() || null,
        community_relationship: formData.community_relationship.trim() || null,
        responsible_education_level:
          formData.responsible_education_level.trim() || null,
        has_internet_access: formData.has_internet_access,
        has_mobile_phone: formData.has_mobile_phone,
        has_computer: formData.has_computer,
      };

      const response = await api.post<FamilyListItemResponse>("/families", payload);
      navigate(`/families/${response.data.id}`, {
        state: {
          flash: {
            type: "success",
            message: "Família cadastrada com sucesso.",
          },
        },
      });
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Não foi possível cadastrar a família. Verifique os campos obrigatórios."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Novo cadastro"
        title="Cadastrar família"
        description="Registre os dados iniciais da família. O código interno será gerado automaticamente ao salvar."
      />

      <form onSubmit={handleSubmit} className="panel-card form-panel">
        <FormSection eyebrow="Dados iniciais" title="Identificação e endereço">
          <div className="detail-item detail-item--form">
            <span>Código interno</span>
            <strong>Gerado pelo sistema</strong>
          </div>

          <label className="form__group">
            <span>Status inicial</span>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="em_analise">Em análise</option>
              <option value="apta_recorrente">Apta recorrente</option>
              <option value="apta_emergencial">Apta emergencial</option>
              <option value="inapta">Inapta</option>
              <option value="inativa">Inativa</option>
            </select>
          </label>

          <label className="form__group">
            <span>Data de cadastro</span>
            <input
              type="date"
              name="registration_date"
              value={formData.registration_date}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="form__group">
            <span>CEP</span>
            <input
              name="zip_code"
              value={formData.zip_code}
              onChange={handleInputChange}
              placeholder="Opcional"
            />
          </label>

          <label className="form__group form__group--wide">
            <span>Rua</span>
            <input
              name="street"
              value={formData.street}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="form__group">
            <span>Número</span>
            <input
              name="number"
              value={formData.number}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="form__group">
            <span>Complemento</span>
            <input
              name="complement"
              value={formData.complement}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Bairro</span>
            <input
              name="neighborhood"
              value={formData.neighborhood}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="form__group">
            <span>Cidade</span>
            <input
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="form__group">
            <span>Estado</span>
            <input
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              maxLength={2}
              required
            />
          </label>

          <label className="form__group form__group--wide">
            <span>Ponto de referência</span>
            <input
              name="reference_point"
              value={formData.reference_point}
              onChange={handleInputChange}
            />
          </label>
        </FormSection>

        <FormSection eyebrow="Composição" title="Moradores e condições básicas">
          <label className="form__group">
            <span>Adultos</span>
            <input
              type="number"
              min="0"
              name="total_adults"
              value={formData.total_adults}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Crianças</span>
            <input
              type="number"
              min="0"
              name="total_children"
              value={formData.total_children}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Idosos</span>
            <input
              type="number"
              min="0"
              name="total_elderly"
              value={formData.total_elderly}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Bebês</span>
            <input
              type="number"
              min="0"
              name="total_babies"
              value={formData.total_babies}
              onChange={handleInputChange}
            />
          </label>

          <div className="detail-item">
            <span>Total de moradores</span>
            <strong>{totalResidents}</strong>
          </div>

          <label className="form__group">
            <span>Cômodos</span>
            <input
              type="number"
              min="0"
              name="rooms_count"
              value={formData.rooms_count}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Quartos</span>
            <input
              type="number"
              min="0"
              name="bedrooms_count"
              value={formData.bedrooms_count}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Tipo de moradia</span>
            <input
              name="housing_type"
              value={formData.housing_type}
              onChange={handleInputChange}
              placeholder="Ex.: cedida, alugada..."
            />
          </label>
        </FormSection>

        <FormSection
          eyebrow="Vulnerabilidades"
          title="Sinais de atenção no acompanhamento"
          gridClassName="checkbox-grid"
        >
          <label className="checkbox-card">
            <input
              type="checkbox"
              name="receives_government_assistance"
              checked={formData.receives_government_assistance}
              onChange={handleInputChange}
            />
            <span>Recebe benefício governamental</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_water_supply"
              checked={formData.has_water_supply}
              onChange={handleInputChange}
            />
            <span>Tem abastecimento de água</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_electricity"
              checked={formData.has_electricity}
              onChange={handleInputChange}
            />
            <span>Tem energia elétrica</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_sanitation"
              checked={formData.has_sanitation}
              onChange={handleInputChange}
            />
            <span>Tem saneamento</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_pregnant_member"
              checked={formData.has_pregnant_member}
              onChange={handleInputChange}
            />
            <span>Há gestante na família</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_disabled_member"
              checked={formData.has_disabled_member}
              onChange={handleInputChange}
            />
            <span>Há pessoa com deficiência</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_chronic_illness_member"
              checked={formData.has_chronic_illness_member}
              onChange={handleInputChange}
            />
            <span>Há doença crônica</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_unemployed_member"
              checked={formData.has_unemployed_member}
              onChange={handleInputChange}
            />
            <span>Há desemprego na família</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="needs_extra_support"
              checked={formData.needs_extra_support}
              onChange={handleInputChange}
            />
            <span>Precisa de apoio extra</span>
          </label>
        </FormSection>

        <FormSection eyebrow="Condição econômica" title="Renda e despesas">
          <label className="form__group">
            <span>Renda mensal total</span>
            <CurrencyInput
              name="monthly_income_total"
              value={formData.monthly_income_total}
              onChange={handleInputChange}
              onBlur={handleCurrencyBlur}
            />
          </label>

          <label className="form__group">
            <span>Despesas essenciais</span>
            <CurrencyInput
              name="monthly_essential_expenses"
              value={formData.monthly_essential_expenses}
              onChange={handleInputChange}
              onBlur={handleCurrencyBlur}
            />
          </label>
        </FormSection>

        <FormSection
          id="vinculo-igreja"
          eyebrow="Vinculo com a igreja"
          title="Igreja, UPG e participacao"
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
            <span>O que faz ou qual vinculo possui</span>
            <textarea
              name="community_relationship"
              value={formData.community_relationship}
              onChange={handleInputChange}
              rows={3}
              placeholder="Ex.: membro, visitante, lider, voluntario, familia acompanhada..."
            />
          </label>

        </FormSection>

        <FormSection
          eyebrow="Acesso digital"
          title="Escolaridade e recursos disponiveis"
        >
          <label className="form__group">
            <span>Escolaridade do responsavel</span>
            <input
              name="responsible_education_level"
              value={formData.responsible_education_level}
              onChange={handleInputChange}
              placeholder="Opcional"
            />
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_internet_access"
              checked={formData.has_internet_access}
              onChange={handleInputChange}
            />
            <span>Tem internet</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_mobile_phone"
              checked={formData.has_mobile_phone}
              onChange={handleInputChange}
            />
            <span>Tem celular</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="has_computer"
              checked={formData.has_computer}
              onChange={handleInputChange}
            />
            <span>Tem computador</span>
          </label>
        </FormSection>

        <FormSection eyebrow="Contato principal" title="Contato inicial da família">
          <label className="form__group">
            <span>Nome do contato</span>
            <input
              name="contact_name"
              value={formData.contact_name}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Telefone</span>
            <input
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Tipo de contato</span>
            <select
              name="contact_type"
              value={formData.contact_type}
              onChange={handleInputChange}
            >
              <option value="principal">Principal</option>
              <option value="secundario">Secundário</option>
              <option value="vizinho">Vizinho</option>
              <option value="parente">Parente</option>
            </select>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="is_whatsapp"
              checked={formData.is_whatsapp}
              onChange={handleInputChange}
            />
            <span>Telefone tem WhatsApp</span>
          </label>

          <label className="form__group form__group--wide">
            <span>Observação do contato</span>
            <input
              name="contact_notes"
              value={formData.contact_notes}
              onChange={handleInputChange}
            />
          </label>
        </FormSection>

        <FormSection eyebrow="Observações" title="Anotações sociais e internas">
          <label className="form__group form__group--wide">
            <span>Observações sociais</span>
            <textarea
              name="social_notes"
              value={formData.social_notes}
              onChange={handleInputChange}
              rows={4}
            />
          </label>

          <label className="form__group form__group--wide">
            <span>Observações internas</span>
            <textarea
              name="internal_notes"
              value={formData.internal_notes}
              onChange={handleInputChange}
              rows={4}
            />
          </label>
        </FormSection>

        {error ? (
          <StateMessage variant="error">{error}</StateMessage>
        ) : null}

        <FormActions>
          <Link to="/families" className="button button--secondary button--link">
            Cancelar
          </Link>

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Cadastrar família"}
          </button>
        </FormActions>
      </form>
    </div>
  );
}
