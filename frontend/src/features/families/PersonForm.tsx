import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  HeartHandshake,
  UserRound,
} from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { CurrencyInput } from "../../components/CurrencyInput";
import type { FamilyPersonCreatePayload } from "../../types/family";
import { getApiErrorMessage } from "../../utils/api-error";
import { formatCurrency, formatDateOnly, formatDecimalInputValue, formatTodayForInput } from "../../utils/format";
import {
  confirmDiscardUnsavedChanges,
  useUnsavedChangesWarning,
} from "../../utils/unsaved-changes";
import {
  personFormSchema,
  personFormValuesToPayload,
  type PersonFormField,
  type PersonFormValues,
} from "./personFormModel";
import styles from "./PersonForm.module.css";

type PersonFormMode = "create" | "edit";

interface PersonFormProps {
  mode: PersonFormMode;
  familyId: string;
  familyCode?: string;
  defaultValues: PersonFormValues;
  onSave: (payload: FamilyPersonCreatePayload) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const steps = [
  {
    name: "Dados",
    title: "Dados do membro",
    fields: ["full_name", "birth_date", "kinship", "gender", "phone", "education_level", "is_family_responsible"],
  },
  {
    name: "Condições",
    title: "Trabalho e condições",
    fields: ["is_currently_studying", "is_currently_working", "occupation", "individual_income", "attends_church", "church_name", "church_role", "has_disability", "has_chronic_illness", "is_pregnant", "is_nursing_mother"],
  },
  { name: "Revisão", title: "Revisar membro", fields: ["notes"] },
] as const satisfies ReadonlyArray<{
  name: string;
  title: string;
  fields: readonly PersonFormField[];
}>;

const fieldOrder = steps.flatMap((step) => [...step.fields]);

const genderOptions = [
  ["", "Não informar"],
  ["masculino", "Masculino"],
  ["feminino", "Feminino"],
  ["outro", "Outro"],
  ["nao_informado", "Não informado"],
] as const;

const educationOptions = [
  ["", "Não informar"],
  ["nao_informado", "Não informado"],
  ["fundamental_incompleto", "Fundamental incompleto"],
  ["fundamental_completo", "Fundamental completo"],
  ["medio_incompleto", "Médio incompleto"],
  ["medio_completo", "Médio completo"],
  ["superior_incompleto", "Superior incompleto"],
  ["superior_completo", "Superior completo"],
] as const;

const conditionFlags = [
  ["has_disability", "Pessoa com deficiência"],
  ["has_chronic_illness", "Doença crônica"],
  ["is_pregnant", "Gestante"],
  ["is_nursing_mother", "Lactante"],
] as const;

export function PersonForm({
  mode,
  familyId,
  familyCode,
  defaultValues,
  onSave,
  onDelete,
}: PersonFormProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [highestVisitedStep, setHighestVisitedStep] = useState(0);
  const [actionError, setActionError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  const {
    control,
    register,
    setFocus,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues,
    mode: "onTouched",
    shouldUnregister: false,
  });

  useUnsavedChangesWarning(isDirty && !isSubmitting && !isDeleting && !saved);
  const values = useWatch({ control }) as PersonFormValues;
  const incomeRegister = register("individual_income");
  const isBusy = isSubmitting || isDeleting;
  const lastStep = step === steps.length - 1;
  const storedGender = defaultValues.gender && !genderOptions.some(([option]) => option === defaultValues.gender)
    ? defaultValues.gender : null;
  const storedEducation = defaultValues.education_level && !educationOptions.some(([option]) => option === defaultValues.education_level)
    ? defaultValues.education_level : null;

  function moveTo(nextStep: number) {
    setStep(nextStep);
    setHighestVisitedStep((previous) => Math.max(previous, nextStep));
    setActionError("");
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      stepHeadingRef.current?.focus();
    });
  }

  async function next() {
    const valid = await trigger([...steps[step].fields], { shouldFocus: true });
    if (valid) {
      moveTo(step + 1);
    } else {
      setActionError("Revise os campos destacados para continuar.");
    }
  }

  function invalid(nextErrors: FieldErrors<PersonFormValues>) {
    const firstField = fieldOrder.find((field) => nextErrors[field]);
    setActionError("Revise os campos destacados antes de salvar.");
    if (!firstField) {
      window.requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    const invalidStep = steps.findIndex((item) =>
      (item.fields as readonly PersonFormField[]).includes(firstField)
    );
    moveTo(Math.max(invalidStep, 0));
    setActionError("Revise os campos destacados antes de salvar.");
    window.requestAnimationFrame(() => setFocus(firstField));
  }

  async function save(valuesToSave: PersonFormValues) {
    setActionError("");
    try {
      await onSave(personFormValuesToPayload(valuesToSave));
      setSaved(true);
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Não foi possível salvar o membro."));
      window.requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  async function deleteMember() {
    if (!onDelete || !window.confirm("Excluir este membro da família? Esta ação não pode ser desfeita.")) return;
    setIsDeleting(true);
    setActionError("");
    try {
      await onDelete();
      setSaved(true);
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Não foi possível excluir o membro."));
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setIsDeleting(false);
    }
  }

  function errorFor(field: PersonFormField) {
    const message = errors[field]?.message;
    return <small id={`${field}-error`} className={styles.fieldError}>{message ? String(message) : ""}</small>;
  }

  function errorId(field: PersonFormField) {
    return errors[field] ? `${field}-error` : undefined;
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <span>Composição familiar</span>
        <h1>{mode === "create" ? "Novo membro" : "Editar membro"}</h1>
        <p>{familyCode ? `Família ${familyCode}` : `Família ${familyId}`}</p>
      </header>

      <form
        className={styles.form}
        noValidate
        data-unsaved-changes={isDirty && !saved}
        onSubmit={(event) => {
          event.preventDefault();
          if (!lastStep) void next();
          else void handleSubmit(save, invalid)(event);
        }}
      >
        <nav className={styles.stepper} aria-label="Etapas do membro">
          <div className={styles.mobileProgress}>
            <span>Etapa {step + 1} de {steps.length}</span>
            <strong>{steps[step].name}</strong>
            <div className={styles.progressTrack} aria-hidden="true">
              <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
            </div>
          </div>
          <ol>
            {steps.map((item, index) => (
              <li key={item.name}>
                <button
                  type="button"
                  disabled={index > highestVisitedStep || isBusy}
                  aria-current={index === step ? "step" : undefined}
                  aria-label={`Etapa ${index + 1}: ${item.name}`}
                  onClick={() => moveTo(index)}
                >
                  <span aria-hidden="true">{index < step ? <Check /> : index + 1}</span>
                  <strong>{item.name}</strong>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles.workspace}>
          <section className={styles.formCard} aria-labelledby="person-step-heading">
            <header className={styles.stepHeader}>
              <span aria-hidden="true">
                {step === 0 ? <UserRound /> : step === 1 ? <HeartHandshake /> : <ClipboardCheck />}
              </span>
              <div>
                <h2 id="person-step-heading" ref={stepHeadingRef} tabIndex={-1}>{steps[step].title}</h2>
              </div>
            </header>

            {step === 0 ? (
              <div className={styles.fields}>
                <label className={`${styles.field} ${styles.wide}`}>
                  <span>Nome completo <b aria-hidden="true">*</b></span>
                  <input {...register("full_name")} autoComplete="name" aria-invalid={Boolean(errors.full_name)} aria-describedby={errorId("full_name")} />
                  {errorFor("full_name")}
                </label>
                <label className={styles.field}>
                  <span>Data de nascimento <b aria-hidden="true">*</b></span>
                  <input type="date" max={formatTodayForInput()} {...register("birth_date")} aria-invalid={Boolean(errors.birth_date)} aria-describedby={errorId("birth_date")} />
                  {errorFor("birth_date")}
                </label>
                <label className={styles.field}>
                  <span>Parentesco <b aria-hidden="true">*</b></span>
                  <input {...register("kinship")} aria-invalid={Boolean(errors.kinship)} aria-describedby={errorId("kinship")} />
                  {errorFor("kinship")}
                </label>
                <label className={styles.field}>
                  <span>Gênero</span>
                  <select {...register("gender")}>{genderOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}{storedGender ? <option value={storedGender}>{storedGender}</option> : null}</select>
                </label>
                <label className={styles.field}>
                  <span>Telefone</span>
                  <input type="tel" inputMode="tel" {...register("phone")} autoComplete="tel" />
                </label>
                <label className={`${styles.field} ${styles.wide}`}>
                  <span>Escolaridade</span>
                  <select {...register("education_level")}>{educationOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}{storedEducation ? <option value={storedEducation}>{storedEducation}</option> : null}</select>
                </label>
                <label className={`${styles.checkRow} ${styles.wide}`}>
                  <input type="checkbox" {...register("is_family_responsible")} />
                  <span>Responsável familiar</span>
                </label>
              </div>
            ) : null}

            {step === 1 ? (
              <div className={styles.sectionStack}>
                <div className={styles.fields}>
                  <label className={styles.checkRow}><input type="checkbox" {...register("is_currently_studying")} /><span>Está estudando</span></label>
                  <label className={styles.checkRow}><input type="checkbox" {...register("is_currently_working")} /><span>Está trabalhando</span></label>
                  <label className={styles.field}><span>Ocupação</span><input {...register("occupation")} /></label>
                  <label className={styles.field}>
                    <span>Renda individual</span>
                    <CurrencyInput
                      {...incomeRegister}
                      value={values.individual_income ?? "0"}
                      aria-invalid={Boolean(errors.individual_income)}
                      aria-describedby={errorId("individual_income")}
                      onChange={(event) => setValue("individual_income", event.target.value, { shouldDirty: true, shouldValidate: true })}
                      onBlur={(event) => {
                        incomeRegister.onBlur(event);
                        setValue("individual_income", formatDecimalInputValue(event.target.value), { shouldDirty: true, shouldValidate: true });
                      }}
                    />
                    {errorFor("individual_income")}
                  </label>
                </div>

                <fieldset className={styles.fieldset} id="vinculo-igreja">
                  <legend>Igreja e UPG</legend>
                  <div className={styles.fields}>
                    <label className={`${styles.checkRow} ${styles.wide}`}><input type="checkbox" {...register("attends_church")} /><span>Frequenta igreja ou UPG</span></label>
                    <label className={styles.field}><span>Igreja ou UPG</span><input {...register("church_name")} /></label>
                    <label className={styles.field}><span>Participação ou vínculo</span><input {...register("church_role")} /></label>
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Condições individuais</legend>
                  <div className={styles.conditions}>
                    {conditionFlags.map(([field, label]) => (
                      <label key={field} className={styles.checkRow}>
                        <input type="checkbox" {...register(field)} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            ) : null}

            {step === 2 ? (
              <div className={styles.review}>
                <dl>
                  <div><dt>Membro</dt><dd>{values.full_name || "—"}</dd></div>
                  <div><dt>Parentesco</dt><dd>{values.kinship || "—"}</dd></div>
                  <div><dt>Nascimento</dt><dd>{values.birth_date ? formatDateOnly(values.birth_date) : "—"}</dd></div>
                  <div><dt>Renda individual</dt><dd>{formatCurrency(values.individual_income || 0)}</dd></div>
                  <div><dt>Responsável familiar</dt><dd>{values.is_family_responsible ? "Sim" : "Não"}</dd></div>
                  <div><dt>Vínculo com igreja/UPG</dt><dd>{values.attends_church ? values.church_name || "Informado" : "Não informado"}</dd></div>
                </dl>
                <label className={styles.field}>
                  <span>Observações</span>
                  <textarea rows={4} {...register("notes")} />
                </label>
                {onDelete ? (
                  <div className={styles.deleteRegion}>
                    <span>Excluir cadastro</span>
                    <button type="button" disabled={isBusy} onClick={() => void deleteMember()}>
                      {isDeleting ? "Excluindo…" : "Excluir membro"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <aside className={styles.summary} aria-label="Resumo do membro">
            <h2>Resumo</h2>
            <dl>
              <div><dt>Família</dt><dd>{familyCode ?? familyId}</dd></div>
              <div><dt>Nome</dt><dd>{values.full_name || "Ainda não informado"}</dd></div>
              <div><dt>Responsável</dt><dd>{values.is_family_responsible ? "Sim" : "Não"}</dd></div>
              <div><dt>Renda</dt><dd>{formatCurrency(values.individual_income || 0)}</dd></div>
            </dl>
          </aside>
        </div>

        {actionError ? <p ref={errorRef} className={styles.errorSummary} role="alert" tabIndex={-1}>{actionError}</p> : null}

        <footer className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            disabled={isBusy}
            onClick={() => {
              if (confirmDiscardUnsavedChanges(isDirty && !saved)) navigate(`/families/${familyId}`);
            }}
          >Cancelar</button>
          <div>
            {step > 0 ? <button type="button" className={styles.secondary} disabled={isBusy} onClick={() => moveTo(step - 1)}><ChevronLeft aria-hidden="true" />Anterior</button> : null}
            {lastStep ? (
              <button
                key="submit-member"
                type="submit"
                className={`${styles.primary} ${styles.submitButton}`}
                disabled={isBusy}
                aria-label={isSubmitting ? "Salvando membro" : mode === "create" ? "Cadastrar membro" : "Salvar alterações"}
              >
                <Check aria-hidden="true" />
                <span className={styles.desktopSubmitLabel}>{isSubmitting ? "Salvando…" : mode === "create" ? "Cadastrar membro" : "Salvar alterações"}</span>
                <span className={styles.mobileSubmitLabel}>{isSubmitting ? "Salvando…" : mode === "create" ? "Cadastrar" : "Salvar"}</span>
              </button>
            ) : (
              <button key="advance-member" type="button" className={styles.primary} disabled={isBusy} onClick={() => void next()}>Próximo<ChevronRight aria-hidden="true" /></button>
            )}
          </div>
        </footer>
      </form>
    </div>
  );
}

export function PersonFormLoading() {
  return <div className={styles.loading} role="status" aria-live="polite">Carregando membro…</div>;
}

export function PersonFormError({ message, backTo }: { message: string; backTo: string }) {
  const navigate = useNavigate();
  return (
    <section className={styles.loadError} role="alert">
      <AlertCircle aria-hidden="true" />
      <div><h1>Não foi possível abrir o membro</h1><p>{message}</p></div>
      <button type="button" className={styles.secondary} onClick={() => navigate(backTo)}><ArrowLeft aria-hidden="true" />Voltar para família</button>
    </section>
  );
}
