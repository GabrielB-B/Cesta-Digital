import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, CalendarRange, Check, Landmark, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { CurrencyInput } from "../../components/CurrencyInput";
import type { FamilyPersonResponse, FamilyBenefitCreatePayload } from "../../types/family";
import { getApiErrorMessage } from "../../utils/api-error";
import { formatCurrency, formatDateOnly, formatDecimalInputValue } from "../../utils/format";
import { confirmDiscardUnsavedChanges, useUnsavedChangesWarning } from "../../utils/unsaved-changes";
import {
  benefitFormSchema,
  benefitFormValuesToPayload,
  type BenefitFormValues,
} from "./benefitFormModel";
import styles from "./BenefitForm.module.css";

interface BenefitFormProps {
  mode: "create" | "edit";
  familyId: string;
  familyCode: string;
  people: FamilyPersonResponse[];
  defaultValues: BenefitFormValues;
  onSave: (payload: FamilyBenefitCreatePayload) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function BenefitForm({
  mode,
  familyId,
  familyCode,
  people,
  defaultValues,
  onSave,
  onDelete,
}: BenefitFormProps) {
  const navigate = useNavigate();
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const [actionError, setActionError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    control,
    register,
    setFocus,
    setValue,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<BenefitFormValues>({
    resolver: zodResolver(benefitFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const values = useWatch({ control }) as BenefitFormValues;
  const amountRegister = register("monthly_amount");
  const isBusy = isSubmitting || isDeleting;
  const selectedPerson = people.find((person) => String(person.id) === values.person_id);
  const missingSelectedPerson = values.person_id && !selectedPerson;

  useUnsavedChangesWarning(isDirty && !isBusy && !saved);

  async function save(valuesToSave: BenefitFormValues) {
    setActionError("");
    try {
      await onSave(benefitFormValuesToPayload(valuesToSave));
      setSaved(true);
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Não foi possível salvar o benefício."));
      window.requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  function invalid(nextErrors: FieldErrors<BenefitFormValues>) {
    setActionError("Revise os campos destacados antes de salvar.");
    const firstInvalid = ["benefit_type", "monthly_amount", "end_date"]
      .find((field) => nextErrors[field as keyof BenefitFormValues]);
    if (firstInvalid) setFocus(firstInvalid as keyof BenefitFormValues);
  }

  async function deleteBenefit() {
    if (!onDelete || !window.confirm("Excluir este benefício da família? Esta ação não pode ser desfeita.")) return;
    setIsDeleting(true);
    setActionError("");
    try {
      await onDelete();
      setSaved(true);
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Não foi possível excluir o benefício."));
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <span>Renda e benefícios</span>
        <h1>{mode === "create" ? "Novo benefício" : "Editar benefício"}</h1>
        <p>Família {familyCode}</p>
      </header>

      <form
        className={styles.form}
        noValidate
        data-unsaved-changes={isDirty && !saved}
        onSubmit={(event) => void handleSubmit(save, invalid)(event)}
      >
        <div className={styles.workspace}>
          <section className={styles.formCard} aria-labelledby="benefit-form-heading">
            <header className={styles.cardHeader}>
              <span aria-hidden="true"><Landmark /></span>
              <h2 id="benefit-form-heading">Dados do benefício</h2>
            </header>

            <div className={styles.fields}>
              <label className={`${styles.field} ${styles.wide}`}>
                <span>Tipo do benefício <b aria-hidden="true">*</b></span>
                <input
                  {...register("benefit_type")}
                  aria-invalid={Boolean(errors.benefit_type)}
                  aria-describedby="benefit_type-error"
                />
                <small id="benefit_type-error" className={styles.fieldError}>{errors.benefit_type?.message ?? ""}</small>
              </label>

              <label className={styles.field}>
                <span>Pessoa vinculada</span>
                <select {...register("person_id")}>
                  <option value="">Toda a família</option>
                  {missingSelectedPerson ? <option value={values.person_id}>Pessoa vinculada anteriormente</option> : null}
                  {people.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
                </select>
              </label>

              <label className={styles.field}>
                <span>Valor mensal <b aria-hidden="true">*</b></span>
                <CurrencyInput
                  {...amountRegister}
                  value={values.monthly_amount}
                  aria-invalid={Boolean(errors.monthly_amount)}
                  aria-describedby="monthly_amount-error"
                  onChange={(event) => setValue("monthly_amount", event.target.value, { shouldDirty: true, shouldValidate: true })}
                  onBlur={(event) => {
                    amountRegister.onBlur(event);
                    setValue("monthly_amount", formatDecimalInputValue(event.target.value), { shouldDirty: true, shouldValidate: true });
                  }}
                />
                <small id="monthly_amount-error" className={styles.fieldError}>{errors.monthly_amount?.message ?? ""}</small>
              </label>
            </div>

            <fieldset className={styles.fieldset}>
              <legend><CalendarRange aria-hidden="true" />Vigência</legend>
              <div className={styles.fields}>
                <label className={styles.field}>
                  <span>Data inicial</span>
                  <input type="date" {...register("start_date")} />
                  <small className={styles.fieldError}>{errors.start_date?.message ?? ""}</small>
                </label>
                <label className={styles.field}>
                  <span>Data final</span>
                  <input type="date" {...register("end_date")} aria-invalid={Boolean(errors.end_date)} aria-describedby="end_date-error" />
                  <small id="end_date-error" className={styles.fieldError}>{errors.end_date?.message ?? ""}</small>
                </label>
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>Cálculo e situação</legend>
              <div className={styles.options}>
                <label className={styles.checkRow}>
                  <input type="checkbox" {...register("counts_as_income")} />
                  <span>Incluir no cálculo da renda familiar</span>
                </label>
                <label className={styles.checkRow}>
                  <input type="checkbox" {...register("is_active")} />
                  <span>Benefício ativo</span>
                </label>
              </div>
            </fieldset>

            <div className={styles.notes}>
              <label className={styles.field}>
                <span>Observações</span>
                <textarea rows={4} {...register("notes")} />
              </label>
            </div>

            {onDelete ? (
              <div className={styles.deleteRegion}>
                <span>Excluir cadastro</span>
                <button type="button" disabled={isBusy} onClick={() => void deleteBenefit()}>
                  <Trash2 aria-hidden="true" />{isDeleting ? "Excluindo…" : "Excluir benefício"}
                </button>
              </div>
            ) : null}
          </section>

          <aside className={styles.summary} aria-label="Resumo do benefício">
            <h2>Resumo</h2>
            <dl>
              <div><dt>Família</dt><dd>{familyCode}</dd></div>
              <div><dt>Benefício</dt><dd>{values.benefit_type || "Ainda não informado"}</dd></div>
              <div><dt>Vínculo</dt><dd>{selectedPerson?.full_name ?? (missingSelectedPerson ? "Pessoa anterior" : "Toda a família")}</dd></div>
              <div><dt>Valor</dt><dd>{formatCurrency(values.monthly_amount)}</dd></div>
              <div><dt>Vigência</dt><dd>{values.start_date ? formatDateOnly(values.start_date) : "Não informada"}{values.end_date ? ` — ${formatDateOnly(values.end_date)}` : ""}</dd></div>
              <div><dt>Situação</dt><dd>{values.is_active ? "Ativo" : "Inativo"}</dd></div>
              <div><dt>Compõe renda</dt><dd>{values.counts_as_income ? "Sim" : "Não"}</dd></div>
            </dl>
          </aside>
        </div>

        {actionError ? <p ref={errorRef} className={styles.errorSummary} role="alert" tabIndex={-1}>{actionError}</p> : null}

        <footer className={styles.actions}>
          <button type="button" className={styles.cancel} disabled={isBusy} onClick={() => {
            if (confirmDiscardUnsavedChanges(isDirty && !saved)) navigate(`/families/${familyId}`);
          }}>Cancelar</button>
          <button type="submit" className={styles.primary} disabled={isBusy}>
            <Check aria-hidden="true" />{isSubmitting ? "Salvando…" : mode === "create" ? "Cadastrar benefício" : "Salvar alterações"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function BenefitFormLoading() {
  return <div className={styles.loading} role="status" aria-live="polite">Carregando benefício…</div>;
}

export function BenefitFormError({ message, backTo }: { message: string; backTo: string }) {
  const navigate = useNavigate();
  return (
    <section className={styles.loadError} role="alert">
      <AlertCircle aria-hidden="true" />
      <div><h1>Não foi possível abrir o benefício</h1><p>{message}</p></div>
      <button type="button" onClick={() => navigate(backTo)}><ArrowLeft aria-hidden="true" />Voltar para família</button>
    </section>
  );
}
