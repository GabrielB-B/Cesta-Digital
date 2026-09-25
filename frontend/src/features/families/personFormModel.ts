import { z } from "zod";
import type {
  FamilyPersonCreatePayload,
  FamilyPersonResponse,
} from "../../types/family";
import { formatTodayForInput } from "../../utils/format";

const requiredText = (message: string, maxLength: number) =>
  z.string().trim().min(1, message).max(maxLength, `Use até ${maxLength} caracteres.`);

export const personFormSchema = z.object({
  full_name: requiredText("Informe o nome completo.", 150),
  birth_date: z.string().refine(
    (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T12:00:00`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    },
    { message: "Informe uma data de nascimento válida." }
  ).refine((value) => value <= formatTodayForInput(), {
    message: "A data de nascimento não pode estar no futuro.",
  }),
  kinship: requiredText("Informe o parentesco.", 50),
  gender: z.string(),
  phone: z.string(),
  education_level: z.string(),
  is_currently_studying: z.boolean(),
  is_currently_working: z.boolean(),
  occupation: z.string(),
  individual_income: z.string().refine(
    (value) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0,
    { message: "A renda deve ser zero ou maior." }
  ),
  attends_church: z.boolean(),
  church_name: z.string(),
  church_role: z.string(),
  has_disability: z.boolean(),
  has_chronic_illness: z.boolean(),
  is_pregnant: z.boolean(),
  is_nursing_mother: z.boolean(),
  notes: z.string(),
  is_family_responsible: z.boolean(),
});

export type PersonFormValues = z.infer<typeof personFormSchema>;
export type PersonFormField = keyof PersonFormValues;

export const newPersonDefaults: PersonFormValues = {
  full_name: "",
  birth_date: "",
  kinship: "",
  gender: "",
  phone: "",
  education_level: "",
  is_currently_studying: false,
  is_currently_working: false,
  occupation: "",
  individual_income: "0",
  attends_church: false,
  church_name: "",
  church_role: "",
  has_disability: false,
  has_chronic_illness: false,
  is_pregnant: false,
  is_nursing_mother: false,
  notes: "",
  is_family_responsible: false,
};

export function personToFormValues(person: FamilyPersonResponse): PersonFormValues {
  return {
    ...newPersonDefaults,
    ...person,
    birth_date: person.birth_date.split("T")[0],
    gender: person.gender ?? "",
    phone: person.phone ?? "",
    education_level: person.education_level ?? "",
    occupation: person.occupation ?? "",
    individual_income: person.individual_income,
    church_name: person.church_name ?? "",
    church_role: person.church_role ?? "",
    notes: person.notes ?? "",
  };
}

const optionalText = (value: string): string | null => value.trim() || null;

export function personFormValuesToPayload(values: PersonFormValues): FamilyPersonCreatePayload {
  return {
    full_name: values.full_name.trim(),
    birth_date: values.birth_date,
    kinship: values.kinship.trim(),
    gender: optionalText(values.gender),
    phone: optionalText(values.phone),
    education_level: optionalText(values.education_level),
    is_currently_studying: values.is_currently_studying,
    is_currently_working: values.is_currently_working,
    occupation: optionalText(values.occupation),
    individual_income: Number(values.individual_income),
    attends_church: values.attends_church,
    church_name: optionalText(values.church_name),
    church_role: optionalText(values.church_role),
    has_disability: values.has_disability,
    has_chronic_illness: values.has_chronic_illness,
    is_pregnant: values.is_pregnant,
    is_nursing_mother: values.is_nursing_mother,
    notes: optionalText(values.notes),
    is_family_responsible: values.is_family_responsible,
  };
}
