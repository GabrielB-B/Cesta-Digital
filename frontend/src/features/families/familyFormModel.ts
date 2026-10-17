import { z } from "zod";
import { formatTodayForInput } from "../../utils/format";
import type {
  FamilyContactCreatePayload,
  FamilyCreatePayload,
  FamilyDetailResponse,
} from "../../types/family";

const familyStatuses = [
  "em_analise",
  "apta_recorrente",
  "apta_emergencial",
  "inapta",
  "inativa",
] as const;

const nonNegativeNumber = (label: string) =>
  z.string().refine(
    (value) => {
      const parsedValue = Number(value);
      return value.trim() !== "" && Number.isFinite(parsedValue) && parsedValue >= 0;
    },
    { message: `${label} deve ser zero ou maior.` }
  );

const requiredText = (message: string) =>
  z.string().refine((value) => value.trim().length > 0, { message });

export const familyFormSchema = z
  .object({
    internal_code: z.string(),
    status: z.enum(familyStatuses),
    registration_date: requiredText("Informe a data de cadastro."),
    last_evaluation_date: z.string(),
    next_revaluation_date: z.string(),
    monthly_income_total: nonNegativeNumber("A renda mensal"),
    monthly_essential_expenses: nonNegativeNumber("As despesas essenciais"),
    receives_government_assistance: z.boolean(),
    housing_type: z.string(),
    has_water_supply: z.boolean(),
    has_electricity: z.boolean(),
    has_sanitation: z.boolean(),
    rooms_count: nonNegativeNumber("A quantidade de cômodos"),
    bedrooms_count: nonNegativeNumber("A quantidade de quartos"),
    zip_code: z.string(),
    street: requiredText("Informe a rua da família."),
    number: requiredText("Informe o número ou S/N."),
    complement: z.string(),
    neighborhood: requiredText("Informe o bairro."),
    city: requiredText("Informe a cidade."),
    state: z.string().refine((value) => /^[A-Za-z]{2}$/.test(value.trim()), {
      message: "Use a UF com 2 letras.",
    }),
    reference_point: z.string(),
    total_adults: nonNegativeNumber("A quantidade de adultos"),
    total_children: nonNegativeNumber("A quantidade de crianças"),
    total_elderly: nonNegativeNumber("A quantidade de idosos"),
    total_babies: nonNegativeNumber("A quantidade de bebês"),
    has_pregnant_member: z.boolean(),
    has_disabled_member: z.boolean(),
    has_chronic_illness_member: z.boolean(),
    has_unemployed_member: z.boolean(),
    needs_extra_support: z.boolean(),
    attends_church: z.boolean(),
    church_name: z.string(),
    community_relationship: z.string(),
    responsible_education_level: z.string(),
    has_internet_access: z.boolean(),
    has_mobile_phone: z.boolean(),
    has_computer: z.boolean(),
    social_notes: z.string(),
    internal_notes: z.string(),
    contact_name: z.string(),
    contact_phone: z.string(),
    contact_type: z.string(),
    is_whatsapp: z.boolean(),
    contact_notes: z.string(),
  })
  .superRefine((values, context) => {
    const totalResidents =
      Number(values.total_adults) +
      Number(values.total_children) +
      Number(values.total_elderly) +
      Number(values.total_babies);

    if (totalResidents < 1) {
      context.addIssue({
        code: "custom",
        path: ["total_adults"],
        message: "A família precisa ter pelo menos 1 morador.",
      });
    }
  });

export type FamilyFormValues = z.infer<typeof familyFormSchema>;
export type FamilyFormField = keyof FamilyFormValues;
export type FamilyFormMode = "create" | "edit";

export const createFamilyDefaultValues: FamilyFormValues = {
  internal_code: "",
  status: "em_analise",
  registration_date: formatTodayForInput(),
  last_evaluation_date: "",
  next_revaluation_date: "",
  monthly_income_total: "0",
  monthly_essential_expenses: "0",
  receives_government_assistance: false,
  housing_type: "",
  has_water_supply: true,
  has_electricity: true,
  has_sanitation: false,
  rooms_count: "0",
  bedrooms_count: "0",
  zip_code: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "SE",
  reference_point: "",
  total_adults: "1",
  total_children: "0",
  total_elderly: "0",
  total_babies: "0",
  has_pregnant_member: false,
  has_disabled_member: false,
  has_chronic_illness_member: false,
  has_unemployed_member: false,
  needs_extra_support: false,
  attends_church: false,
  church_name: "",
  community_relationship: "",
  responsible_education_level: "",
  has_internet_access: false,
  has_mobile_phone: false,
  has_computer: false,
  social_notes: "",
  internal_notes: "",
  contact_name: "",
  contact_phone: "",
  contact_type: "principal",
  is_whatsapp: true,
  contact_notes: "",
};

function dateForInput(value: string | null | undefined): string {
  return value ? value.split("T")[0] : "";
}

function numberForInput(value: string | number | null | undefined): string {
  return String(value ?? 0);
}

export function familyDetailToFormValues(
  family: FamilyDetailResponse
): FamilyFormValues {
  const primaryContact = family.contacts[0];

  return {
    internal_code: family.internal_code,
    status: family.status as FamilyFormValues["status"],
    registration_date: dateForInput(family.registration_date),
    last_evaluation_date: dateForInput(family.last_evaluation_date),
    next_revaluation_date: dateForInput(family.next_revaluation_date),
    monthly_income_total: numberForInput(family.monthly_income_total),
    monthly_essential_expenses: numberForInput(
      family.monthly_essential_expenses
    ),
    receives_government_assistance: family.receives_government_assistance,
    housing_type: family.housing_type ?? "",
    has_water_supply: family.has_water_supply,
    has_electricity: family.has_electricity,
    has_sanitation: family.has_sanitation,
    rooms_count: numberForInput(family.rooms_count),
    bedrooms_count: numberForInput(family.bedrooms_count),
    zip_code: family.zip_code ?? "",
    street: family.street,
    number: family.number,
    complement: family.complement ?? "",
    neighborhood: family.neighborhood,
    city: family.city,
    state: family.state,
    reference_point: family.reference_point ?? "",
    total_adults: numberForInput(family.total_adults),
    total_children: numberForInput(family.total_children),
    total_elderly: numberForInput(family.total_elderly),
    total_babies: numberForInput(family.total_babies),
    has_pregnant_member: family.has_pregnant_member,
    has_disabled_member: family.has_disabled_member,
    has_chronic_illness_member: family.has_chronic_illness_member,
    has_unemployed_member: family.has_unemployed_member,
    needs_extra_support: family.needs_extra_support,
    attends_church: family.attends_church,
    church_name: family.church_name ?? "",
    community_relationship: family.community_relationship ?? "",
    responsible_education_level: family.responsible_education_level ?? "",
    has_internet_access: family.has_internet_access,
    has_mobile_phone: family.has_mobile_phone,
    has_computer: family.has_computer,
    social_notes: family.social_notes ?? "",
    internal_notes: family.internal_notes ?? "",
    contact_name: primaryContact?.contact_name ?? "",
    contact_phone: primaryContact?.phone ?? "",
    contact_type: primaryContact?.contact_type ?? "principal",
    is_whatsapp: primaryContact?.is_whatsapp ?? true,
    contact_notes: primaryContact?.notes ?? "",
  };
}

export function getAdditionalFamilyContacts(
  family: FamilyDetailResponse
): FamilyContactCreatePayload[] {
  return family.contacts.slice(1).map((contact) => ({
    contact_name: contact.contact_name,
    phone: contact.phone,
    contact_type: contact.contact_type,
    is_whatsapp: contact.is_whatsapp,
    notes: contact.notes,
  }));
}

export function getFamilyResidentsTotal(values: FamilyFormValues): number {
  return (
    Number(values.total_adults) +
    Number(values.total_children) +
    Number(values.total_elderly) +
    Number(values.total_babies)
  );
}

export function familyFormValuesToPayload(
  values: FamilyFormValues,
  mode: FamilyFormMode,
  additionalContacts: FamilyContactCreatePayload[] = []
): FamilyCreatePayload {
  const totalResidents = getFamilyResidentsTotal(values);
  const primaryContact: FamilyContactCreatePayload[] =
    values.contact_name.trim() || values.contact_phone.trim()
      ? [
          {
            contact_name: values.contact_name.trim() || null,
            phone: values.contact_phone.trim() || null,
            contact_type: values.contact_type,
            is_whatsapp: values.is_whatsapp,
            notes: values.contact_notes.trim() || null,
          },
        ]
      : [];

  const payload: FamilyCreatePayload = {
    status: values.status,
    registration_date: values.registration_date,
    last_evaluation_date: values.last_evaluation_date || null,
    next_revaluation_date: values.next_revaluation_date || null,
    monthly_income_total: Number(values.monthly_income_total),
    monthly_essential_expenses: Number(values.monthly_essential_expenses),
    income_per_capita:
      totalResidents > 0
        ? Number(values.monthly_income_total) / totalResidents
        : 0,
    receives_government_assistance: values.receives_government_assistance,
    housing_type: values.housing_type.trim() || null,
    has_water_supply: values.has_water_supply,
    has_electricity: values.has_electricity,
    has_sanitation: values.has_sanitation,
    rooms_count: Number(values.rooms_count),
    bedrooms_count: Number(values.bedrooms_count),
    zip_code: values.zip_code.trim() || null,
    street: values.street.trim(),
    number: values.number.trim(),
    complement: values.complement.trim() || null,
    neighborhood: values.neighborhood.trim(),
    city: values.city.trim(),
    state: values.state.trim().toUpperCase(),
    reference_point: values.reference_point.trim() || null,
    total_residents: totalResidents,
    total_adults: Number(values.total_adults),
    total_children: Number(values.total_children),
    total_elderly: Number(values.total_elderly),
    total_babies: Number(values.total_babies),
    has_pregnant_member: values.has_pregnant_member,
    has_disabled_member: values.has_disabled_member,
    has_chronic_illness_member: values.has_chronic_illness_member,
    has_unemployed_member: values.has_unemployed_member,
    needs_extra_support: values.needs_extra_support,
    attends_church: values.attends_church,
    church_name: values.church_name.trim() || null,
    community_relationship: values.community_relationship.trim() || null,
    responsible_education_level:
      values.responsible_education_level.trim() || null,
    has_internet_access: values.has_internet_access,
    has_mobile_phone: values.has_mobile_phone,
    has_computer: values.has_computer,
    social_notes: values.social_notes.trim() || null,
    internal_notes: values.internal_notes.trim() || null,
    contacts: [...primaryContact, ...additionalContacts],
  };

  if (mode === "edit") {
    payload.internal_code = values.internal_code.trim();
  }

  return payload;
}
