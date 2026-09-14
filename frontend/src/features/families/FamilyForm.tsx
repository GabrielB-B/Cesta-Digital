import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  HeartHandshake,
  Home,
  MapPin,
  Users,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { CurrencyInput } from "../../components/CurrencyInput";
import { getApiErrorMessage } from "../../utils/api-error";
import { formatCurrency, formatDecimalInputValue, formatDateOnly } from "../../utils/format";
import {
  confirmDiscardUnsavedChanges,
  useUnsavedChangesWarning,
} from "../../utils/unsaved-changes";
import type {
  FamilyContactCreatePayload,
  FamilyCreatePayload,
} from "../../types/family";
import {
  familyFormSchema,
  familyFormValuesToPayload,
  getFamilyResidentsTotal,
  type FamilyFormField,
  type FamilyFormMode,
  type FamilyFormValues,
} from "./familyFormModel";
import styles from "./FamilyForm.module.css";

interface FamilyFormProps {
  mode: FamilyFormMode;
  defaultValues: FamilyFormValues;
  additionalContacts?: FamilyContactCreatePayload[];
  cancelTo: string;
  onSubmit: (payload: FamilyCreatePayload) => Promise<void>;
}

interface FamilyFormStep {
  id: string;
  label: string;
  shortLabel: string;
  title: string;
  description: string;
  fields: readonly FamilyFormField[];
}

const steps: readonly FamilyFormStep[] = [
  {
    id: "cadastro",
    label: "Cadastro",
    shortLabel: "Cadastro",
    title: "Cadastro e endereço",
    description: "Informe a localização usada no atendimento.",
    fields: [
      "status",
      "registration_date",
      "zip_code",
      "street",
      "number",
      "complement",
      "neighborhood",
      "city",
      "state",
      "reference_point",
    ],
  },
  {
    id: "moradores",
    label: "Moradores",
    shortLabel: "Moradores",
    title: "Moradores e moradia",
    description: "Registre a composição declarada no cadastro inicial.",
    fields: [
      "total_adults",
      "total_children",
      "total_elderly",
      "total_babies",
      "rooms_count",
      "bedrooms_count",
      "housing_type",
      "has_water_supply",
      "has_electricity",
      "has_sanitation",
    ],
  },
  {
    id: "condicoes",
    label: "Condições",
    shortLabel: "Condições",
    title: "Renda e condições sociais",
    description: "Esses dados apoiam a avaliação, mas não definem a decisão final.",
    fields: [
      "monthly_income_total",
      "monthly_essential_expenses",
      "receives_government_assistance",
      "has_pregnant_member",
      "has_disabled_member",
      "has_chronic_illness_member",
      "has_unemployed_member",
      "needs_extra_support",
    ],
  },
  {
    id: "contato",
    label: "Contato",
    shortLabel: "Contato",
    title: "Contato e rede de apoio",
    description: "Mantenha apenas os dados úteis para o acompanhamento.",
    fields: [
      "contact_name",
      "contact_phone",
      "contact_type",
      "is_whatsapp",
      "contact_notes",
      "attends_church",
      "church_name",
      "community_relationship",
      "responsible_education_level",
      "has_internet_access",
      "has_mobile_phone",
      "has_computer",
    ],
  },
  {
    id: "revisao",
    label: "Revisão",
    shortLabel: "Revisão",
    title: "Revisão e observações",
    description: "Confira os dados antes de salvar.",
    fields: ["social_notes", "internal_notes"],
  },
] as const;

const allFieldOrder = steps.flatMap((step) => step.fields);

const familyStatusLabels: Record<FamilyFormValues["status"], string> = {
  em_analise: "Em análise",
  apta_recorrente: "Apta recorrente",
  apta_emergencial: "Apta emergencial",
  inapta: "Inapta",
  inativa: "Inativa",
};

function isAssessmentStatus(status: FamilyFormValues["status"]): boolean {
  return ["apta_recorrente", "apta_emergencial", "inapta"].includes(status);
}

function getErrorMessage(
  errors: FieldErrors<FamilyFormValues>,
  field: FamilyFormField
): string | undefined {
  const message = errors[field]?.message;
  return typeof message === "string" ? message : undefined;
}

function getStepForField(field: FamilyFormField): number {
  const stepIndex = steps.findIndex((step) => step.fields.includes(field));
  return stepIndex >= 0 ? stepIndex : 0;
}

export function FamilyForm({
  mode,
  defaultValues,
  additionalContacts = [],
  cancelTo,
  onSubmit,
}: FamilyFormProps) {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [highestVisitedStep, setHighestVisitedStep] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const hasChangesRef = useRef(false);
  const [submitError, setSubmitError] = useState("");
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const errorSummaryRef = useRef<HTMLParagraphElement | null>(null);

  const {
    control,
    register,
    setValue,
    setFocus,
    trigger,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FamilyFormValues>({
    resolver: zodResolver(familyFormSchema),
    defaultValues,
    mode: "onTouched",
    shouldFocusError: true,
    shouldUnregister: false,
  });

  useUnsavedChangesWarning(hasChanges && !isSubmitting);

  const watchedValues = useWatch({ control }) as FamilyFormValues;
  const totalResidents = getFamilyResidentsTotal(watchedValues);
  const incomePerCapita =
    totalResidents > 0
      ? Number(watchedValues.monthly_income_total) / totalResidents
      : 0;
  const assessmentStatus = useMemo(
    () =>
      isAssessmentStatus(defaultValues.status) ? defaultValues.status : null,
    [defaultValues.status]
  );
  const currentStep = steps[activeStep];
  const isFinalStep = activeStep === steps.length - 1;

  function focusStepHeading() {
    window.requestAnimationFrame(() => stepHeadingRef.current?.focus());
  }

  function moveToStep(stepIndex: number) {
    setActiveStep(stepIndex);
    setHighestVisitedStep((current) => Math.max(current, stepIndex));
    setSubmitError("");
    focusStepHeading();
  }

  async function goToNextStep() {
    setSubmitError("");
    const isStepValid = await trigger([...currentStep.fields], {
      shouldFocus: true,
    });

    if (isStepValid) {
      moveToStep(Math.min(activeStep + 1, steps.length - 1));
    }
  }

  function goToPreviousStep() {
    moveToStep(Math.max(activeStep - 1, 0));
  }

  async function submitValid(values: FamilyFormValues) {
    setSubmitError("");

    try {
      await onSubmit(
        familyFormValuesToPayload(values, mode, additionalContacts)
      );
      hasChangesRef.current = false;
      setHasChanges(false);
    } catch (error) {
      setSubmitError(
        getApiErrorMessage(
          error,
          mode === "create"
            ? "Não foi possível cadastrar a família."
            : "Não foi possível atualizar o cadastro da família."
        )
      );
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
    }
  }

  function submitInvalid(nextErrors: FieldErrors<FamilyFormValues>) {
    const firstInvalidField = allFieldOrder.find((field) => nextErrors[field]);
    setSubmitError("Revise os campos destacados antes de salvar.");

    if (!firstInvalidField) {
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    const invalidStep = getStepForField(firstInvalidField);
    setActiveStep(invalidStep);
    setHighestVisitedStep((current) => Math.max(current, invalidStep));
    window.requestAnimationFrame(() => setFocus(firstInvalidField));
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!isFinalStep) {
      event.preventDefault();
      void goToNextStep();
      return;
    }

    void handleSubmit(submitValid, submitInvalid)(event);
  }

  function markFormAsChanged() {
    hasChangesRef.current = true;
    setHasChanges(true);
    setSubmitError("");
  }

  function fieldError(field: FamilyFormField) {
    const message = getErrorMessage(errors, field);
    return message ? (
      <small id={`${field}-error`} className={styles.fieldError} role="alert">
        {message}
      </small>
    ) : null;
  }

  function fieldDescribedBy(field: FamilyFormField): string | undefined {
    return getErrorMessage(errors, field) ? `${field}-error` : undefined;
  }

  const incomeRegistration = register("monthly_income_total");
  const expensesRegistration = register("monthly_essential_expenses");

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span>{mode === "create" ? "Novo cadastro" : "Cadastro social"}</span>
          <h1>{mode === "create" ? "Cadastrar família" : "Editar família"}</h1>
          <p>
            {mode === "create"
              ? "Preencha os dados essenciais para iniciar o acompanhamento."
              : `Atualize os dados de ${defaultValues.internal_code}.`}
          </p>
        </div>
      </header>

      <form
        onSubmit={handleFormSubmit}
        onInputCapture={markFormAsChanged}
        onChange={markFormAsChanged}
        data-unsaved-changes={hasChanges}
        className={styles.form}
        noValidate
      >
        <nav className={styles.stepper} aria-label="Etapas do cadastro da família">
          <div className={styles.mobileProgress}>
            <span>
              Etapa {activeStep + 1} de {steps.length}
            </span>
            <strong>{currentStep.shortLabel}</strong>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }} />
          </div>
          <ol>
            {steps.map((step, index) => {
              const isCompleted = index < activeStep;
              const isCurrent = index === activeStep;
              const isAvailable = index <= highestVisitedStep;

              return (
                <li key={step.id} className={isCurrent ? styles.currentStep : ""}>
                  <button
                    type="button"
                    onClick={() => moveToStep(index)}
                    disabled={!isAvailable || isSubmitting}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Etapa ${index + 1}: ${step.label}`}
                  >
                    <span aria-hidden="true">
                      {isCompleted ? <Check /> : index + 1}
                    </span>
                    <strong>{step.label}</strong>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className={styles.workspace}>
          <section className={styles.formCard} aria-labelledby={`${currentStep.id}-title`}>
            <header className={styles.stepHeader}>
              <div className={styles.stepIcon} aria-hidden="true">
                {activeStep === 0 ? <MapPin /> : null}
                {activeStep === 1 ? <Users /> : null}
                {activeStep === 2 ? <HeartHandshake /> : null}
                {activeStep === 3 ? <Home /> : null}
                {activeStep === 4 ? <ClipboardCheck /> : null}
              </div>
              <div>
                <h2
                  id={`${currentStep.id}-title`}
                  ref={stepHeadingRef}
                  tabIndex={-1}
                >
                  {currentStep.title}
                </h2>
                <p>{currentStep.description}</p>
              </div>
            </header>

            <input type="hidden" {...register("internal_code")} />
            <input type="hidden" {...register("last_evaluation_date")} />
            <input type="hidden" {...register("next_revaluation_date")} />

            {activeStep === 0 ? (
              <div className={styles.fields}>
                {mode === "edit" ? (
                  <div className={styles.readOnlyField}>
                    <span>Código interno</span>
                    <strong>{defaultValues.internal_code}</strong>
                  </div>
                ) : null}

                <label className={styles.field}>
                  <span>
                    {mode === "create" ? "Status inicial" : "Status do cadastro"}
                  </span>
                  <select
                    {...register("status")}
                    aria-describedby="family-status-help"
                  >
                    {assessmentStatus ? (
                      <option value={assessmentStatus} disabled>
                        {familyStatusLabels[assessmentStatus]} · avaliação social
                      </option>
                    ) : null}
                    <option value="em_analise">Em análise</option>
                    <option value="inativa">Inativa</option>
                  </select>
                  <small id="family-status-help" className={styles.mobileStatusGuidance}>
                    A aptidão é definida em Avaliações.
                  </small>
                </label>

                <label className={styles.field}>
                  <span>
                    Data de cadastro <b aria-hidden="true">*</b>
                  </span>
                  <input
                    type="date"
                    {...register("registration_date")}
                    aria-invalid={Boolean(errors.registration_date)}
                    aria-describedby={fieldDescribedBy("registration_date")}
                  />
                  {fieldError("registration_date")}
                </label>

                <label className={styles.field}>
                  <span>CEP</span>
                  <input {...register("zip_code")} autoComplete="postal-code" />
                </label>

                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>
                    Rua <b aria-hidden="true">*</b>
                  </span>
                  <input
                    {...register("street")}
                    autoComplete="address-line1"
                    aria-invalid={Boolean(errors.street)}
                    aria-describedby={fieldDescribedBy("street")}
                  />
                  {fieldError("street")}
                </label>

                <label className={styles.field}>
                  <span>
                    Número <b aria-hidden="true">*</b>
                  </span>
                  <input
                    {...register("number")}
                    aria-invalid={Boolean(errors.number)}
                    aria-describedby={fieldDescribedBy("number")}
                  />
                  {fieldError("number")}
                </label>

                <label className={styles.field}>
                  <span>Complemento</span>
                  <input {...register("complement")} autoComplete="address-line2" />
                </label>

                <label className={styles.field}>
                  <span>
                    Bairro <b aria-hidden="true">*</b>
                  </span>
                  <input
                    {...register("neighborhood")}
                    aria-invalid={Boolean(errors.neighborhood)}
                    aria-describedby={fieldDescribedBy("neighborhood")}
                  />
                  {fieldError("neighborhood")}
                </label>

                <label className={styles.field}>
                  <span>
                    Cidade <b aria-hidden="true">*</b>
                  </span>
                  <input
                    {...register("city")}
                    autoComplete="address-level2"
                    aria-invalid={Boolean(errors.city)}
                    aria-describedby={fieldDescribedBy("city")}
                  />
                  {fieldError("city")}
                </label>

                <label className={styles.field}>
                  <span>
                    Estado <b aria-hidden="true">*</b>
                  </span>
                  <input
                    {...register("state")}
                    autoComplete="address-level1"
                    maxLength={2}
                    aria-invalid={Boolean(errors.state)}
                    aria-describedby={fieldDescribedBy("state")}
                  />
                  {fieldError("state")}
                </label>

                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>Ponto de referência</span>
                  <input {...register("reference_point")} />
                </label>
              </div>
            ) : null}

            {activeStep === 1 ? (
              <div className={styles.sectionStack}>
                <fieldset className={styles.fieldset}>
                  <legend>Composição declarada</legend>
                  <div className={styles.fields}>
                    {(
                      [
                        ["total_adults", "Adultos"],
                        ["total_children", "Crianças"],
                        ["total_elderly", "Idosos"],
                        ["total_babies", "Bebês"],
                      ] as const
                    ).map(([name, label]) => (
                      <label className={styles.field} key={name}>
                        <span>{label}</span>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          {...register(name)}
                          aria-invalid={Boolean(errors[name])}
                          aria-describedby={fieldDescribedBy(name)}
                        />
                        {fieldError(name)}
                      </label>
                    ))}
                    <div className={`${styles.totalResidents} ${styles.fieldWide}`}>
                      <span>Total de moradores</span>
                      <strong>{totalResidents}</strong>
                    </div>
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Moradia</legend>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span>Tipo de moradia</span>
                      <input {...register("housing_type")} />
                    </label>
                    <label className={styles.field}>
                      <span>Cômodos</span>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        {...register("rooms_count")}
                        aria-invalid={Boolean(errors.rooms_count)}
                        aria-describedby={fieldDescribedBy("rooms_count")}
                      />
                      {fieldError("rooms_count")}
                    </label>
                    <label className={styles.field}>
                      <span>Quartos</span>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        {...register("bedrooms_count")}
                        aria-invalid={Boolean(errors.bedrooms_count)}
                        aria-describedby={fieldDescribedBy("bedrooms_count")}
                      />
                      {fieldError("bedrooms_count")}
                    </label>
                  </div>
                  <div className={styles.checkList}>
                    <label>
                      <input type="checkbox" {...register("has_water_supply")} />
                      <span>Abastecimento de água</span>
                    </label>
                    <label>
                      <input type="checkbox" {...register("has_electricity")} />
                      <span>Energia elétrica</span>
                    </label>
                    <label>
                      <input type="checkbox" {...register("has_sanitation")} />
                      <span>Saneamento</span>
                    </label>
                  </div>
                </fieldset>
              </div>
            ) : null}

            {activeStep === 2 ? (
              <div className={styles.sectionStack}>
                <fieldset className={styles.fieldset}>
                  <legend>Condição econômica</legend>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span>Renda mensal total</span>
                      <CurrencyInput
                        {...incomeRegistration}
                        onBlur={(event) => {
                          void incomeRegistration.onBlur(event);
                          setValue(
                            "monthly_income_total",
                            formatDecimalInputValue(event.target.value),
                            { shouldDirty: true, shouldValidate: true }
                          );
                        }}
                        aria-invalid={Boolean(errors.monthly_income_total)}
                        aria-describedby={fieldDescribedBy("monthly_income_total")}
                      />
                      {fieldError("monthly_income_total")}
                    </label>
                    <label className={styles.field}>
                      <span>Despesas essenciais</span>
                      <CurrencyInput
                        {...expensesRegistration}
                        onBlur={(event) => {
                          void expensesRegistration.onBlur(event);
                          setValue(
                            "monthly_essential_expenses",
                            formatDecimalInputValue(event.target.value),
                            { shouldDirty: true, shouldValidate: true }
                          );
                        }}
                        aria-invalid={Boolean(errors.monthly_essential_expenses)}
                        aria-describedby={fieldDescribedBy(
                          "monthly_essential_expenses"
                        )}
                      />
                      {fieldError("monthly_essential_expenses")}
                    </label>
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Condições informadas</legend>
                  <div className={styles.checkList}>
                    <label>
                      <input
                        type="checkbox"
                        {...register("receives_government_assistance")}
                      />
                      <span>Recebe benefício governamental</span>
                    </label>
                    <label>
                      <input type="checkbox" {...register("has_pregnant_member")} />
                      <span>Gestante na família</span>
                    </label>
                    <label>
                      <input type="checkbox" {...register("has_disabled_member")} />
                      <span>Pessoa com deficiência</span>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        {...register("has_chronic_illness_member")}
                      />
                      <span>Doença crônica</span>
                    </label>
                    <label>
                      <input type="checkbox" {...register("has_unemployed_member")} />
                      <span>Desemprego na família</span>
                    </label>
                    <label>
                      <input type="checkbox" {...register("needs_extra_support")} />
                      <span>Precisa de apoio extra</span>
                    </label>
                  </div>
                </fieldset>
              </div>
            ) : null}

            {activeStep === 3 ? (
              <div className={styles.sectionStack}>
                <fieldset className={styles.fieldset}>
                  <legend>Contato principal</legend>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span>Nome do contato</span>
                      <input {...register("contact_name")} autoComplete="name" />
                    </label>
                    <label className={styles.field}>
                      <span>Telefone</span>
                      <input
                        {...register("contact_phone")}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Tipo de contato</span>
                      <select {...register("contact_type")}>
                        <option value="principal">Principal</option>
                        <option value="secundario">Secundário</option>
                        <option value="vizinho">Vizinho</option>
                        <option value="parente">Parente</option>
                      </select>
                    </label>
                    <label className={styles.singleCheck}>
                      <input type="checkbox" {...register("is_whatsapp")} />
                      <span>Telefone com WhatsApp</span>
                    </label>
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span>Observação do contato</span>
                      <input {...register("contact_notes")} />
                    </label>
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Igreja, UPG e participação</legend>
                  <div className={styles.fields}>
                    <label className={styles.singleCheck}>
                      <input type="checkbox" {...register("attends_church")} />
                      <span>Frequenta igreja ou UPG</span>
                    </label>
                    <label className={styles.field}>
                      <span>Igreja ou UPG</span>
                      <input
                        {...register("church_name")}
                        disabled={!watchedValues.attends_church}
                      />
                    </label>
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span>Participação ou vínculo</span>
                      <textarea
                        {...register("community_relationship")}
                        rows={3}
                        disabled={!watchedValues.attends_church}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Escolaridade e acesso digital</legend>
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span>Escolaridade do responsável</span>
                      <input {...register("responsible_education_level")} />
                    </label>
                  </div>
                  <div className={styles.checkList}>
                    <label>
                      <input type="checkbox" {...register("has_internet_access")} />
                      <span>Tem internet</span>
                    </label>
                    <label>
                      <input type="checkbox" {...register("has_mobile_phone")} />
                      <span>Tem celular</span>
                    </label>
                    <label>
                      <input type="checkbox" {...register("has_computer")} />
                      <span>Tem computador</span>
                    </label>
                  </div>
                </fieldset>
              </div>
            ) : null}

            {activeStep === 4 ? (
              <div className={styles.sectionStack}>
                <dl className={styles.reviewGrid}>
                  <div>
                    <dt>Endereço</dt>
                    <dd>
                      {watchedValues.street || "Rua não informada"}
                      {watchedValues.number ? `, ${watchedValues.number}` : ""}
                      <span>
                        {[watchedValues.neighborhood, watchedValues.city, watchedValues.state]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Moradores</dt>
                    <dd>
                      {totalResidents}
                      <span>composição declarada</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Renda mensal</dt>
                    <dd>
                      {formatCurrency(watchedValues.monthly_income_total)}
                      <span>{formatCurrency(incomePerCapita)} por pessoa</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Contato</dt>
                    <dd>
                      {watchedValues.contact_name || "Não informado"}
                      <span>{watchedValues.contact_phone || "Sem telefone"}</span>
                    </dd>
                  </div>
                </dl>

                <fieldset className={styles.fieldset}>
                  <legend>Observações</legend>
                  <div className={styles.fields}>
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span>Observações sociais</span>
                      <textarea {...register("social_notes")} rows={4} />
                    </label>
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span>Observações internas</span>
                      <textarea {...register("internal_notes")} rows={4} />
                    </label>
                  </div>
                </fieldset>
              </div>
            ) : null}
          </section>

          <aside className={styles.summaryCard} aria-label="Resumo do cadastro">
            <header>
              <h2>Resumo</h2>
              <span>{activeStep + 1}/{steps.length}</span>
            </header>
            <dl>
              <div>
                <dt>Status</dt>
                <dd>{familyStatusLabels[watchedValues.status]}</dd>
              </div>
              <div>
                <dt>Moradores</dt>
                <dd>{totalResidents}</dd>
              </div>
              <div>
                <dt>Renda por pessoa</dt>
                <dd>{formatCurrency(incomePerCapita)}</dd>
              </div>
              {mode === "edit" && defaultValues.last_evaluation_date ? (
                <div>
                  <dt>Última avaliação</dt>
                  <dd>{formatDateOnly(defaultValues.last_evaluation_date)}</dd>
                </div>
              ) : null}
            </dl>
            <div className={styles.assessmentNote}>
              <ClipboardCheck aria-hidden="true" />
              <p>
                <strong>Avaliação social</strong>
                <span>A aptidão é calculada e decidida no fluxo de Avaliações.</span>
              </p>
            </div>
          </aside>
        </div>

        {submitError ? (
          <p
            ref={errorSummaryRef}
            className={styles.errorSummary}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            {submitError}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelAction}
            disabled={isSubmitting}
            onClick={() => {
              if (confirmDiscardUnsavedChanges(hasChangesRef.current)) {
                navigate(cancelTo);
              }
            }}
          >
            Cancelar
          </button>

          <div>
            {activeStep > 0 ? (
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={(event) => {
                  event.preventDefault();
                  goToPreviousStep();
                }}
                disabled={isSubmitting}
              >
                <ChevronLeft aria-hidden="true" />
                Anterior
              </button>
            ) : null}

            {isFinalStep ? (
              <button
                type="submit"
                className={styles.primaryAction}
                disabled={isSubmitting}
              >
                <Check aria-hidden="true" />
                {isSubmitting
                  ? "Salvando…"
                  : mode === "create"
                    ? "Cadastrar família"
                    : "Salvar alterações"}
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryAction}
                onClick={(event) => {
                  event.preventDefault();
                  void goToNextStep();
                }}
                disabled={isSubmitting}
              >
                Próximo
                <ChevronRight aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export function FamilyFormLoading() {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span aria-hidden="true" />
      <strong>Carregando cadastro da família…</strong>
    </div>
  );
}

interface FamilyFormErrorProps {
  message: string;
  onBack: () => void;
}

export function FamilyFormError({ message, onBack }: FamilyFormErrorProps) {
  return (
    <section className={styles.loadError} role="alert">
      <span className={styles.loadErrorIcon} aria-hidden="true">
        <AlertCircle />
      </span>
      <div>
        <span>Cadastro indisponível</span>
        <h1>Não foi possível abrir esta família</h1>
        <p>{message}</p>
      </div>
      <button type="button" className={styles.secondaryAction} onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        Voltar para famílias
      </button>
    </section>
  );
}
