import { z } from "zod";
import type {
  FamilyBenefitCreatePayload,
  FamilyBenefitResponse,
} from "../../types/family";

const optionalDate = z.string().refine(
  (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
  { message: "Informe uma data válida." },
);

export const benefitFormSchema = z.object({
  person_id: z.string(),
  benefit_type: z.string().trim().min(1, "Informe o tipo do benefício.").max(50, "Use até 50 caracteres."),
  monthly_amount: z.string().refine(
    (value) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0,
    { message: "O valor deve ser zero ou maior." },
  ),
  counts_as_income: z.boolean(),
  is_active: z.boolean(),
  start_date: optionalDate,
  end_date: optionalDate,
  notes: z.string(),
}).superRefine((values, context) => {
  if (values.start_date && values.end_date && values.end_date < values.start_date) {
    context.addIssue({
      code: "custom",
      path: ["end_date"],
      message: "A data final não pode ser anterior à inicial.",
    });
  }
});

export type BenefitFormValues = z.infer<typeof benefitFormSchema>;

export const newBenefitDefaults: BenefitFormValues = {
  person_id: "",
  benefit_type: "",
  monthly_amount: "0",
  counts_as_income: true,
  is_active: true,
  start_date: "",
  end_date: "",
  notes: "",
};

export function benefitToFormValues(benefit: FamilyBenefitResponse): BenefitFormValues {
  return {
    person_id: benefit.person_id ? String(benefit.person_id) : "",
    benefit_type: benefit.benefit_type,
    monthly_amount: benefit.monthly_amount,
    counts_as_income: benefit.counts_as_income,
    is_active: benefit.is_active,
    start_date: benefit.start_date ?? "",
    end_date: benefit.end_date ?? "",
    notes: benefit.notes ?? "",
  };
}

export function benefitFormValuesToPayload(values: BenefitFormValues): FamilyBenefitCreatePayload {
  return {
    person_id: values.person_id ? Number(values.person_id) : null,
    benefit_type: values.benefit_type.trim(),
    monthly_amount: Number(values.monthly_amount),
    counts_as_income: values.counts_as_income,
    is_active: values.is_active,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
    notes: values.notes.trim() || null,
  };
}
