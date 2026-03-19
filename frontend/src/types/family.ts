export interface FamilyContactResponse {
  id: number;
  contact_name: string | null;
  phone: string | null;
  contact_type: string;
  is_whatsapp: boolean;
  notes: string | null;
}

export interface FamilyPersonResponse {
  id: number;
  full_name: string;
  birth_date: string;
  kinship: string;
  gender: string | null;
  phone: string | null;
  education_level: string | null;
  is_currently_studying: boolean;
  is_currently_working: boolean;
  occupation: string | null;
  individual_income: string;
  has_disability: boolean;
  has_chronic_illness: boolean;
  is_pregnant: boolean;
  is_nursing_mother: boolean;
  notes: string | null;
  is_family_responsible: boolean;
}

export interface FamilyBenefitResponse {
  id: number;
  person_id: number | null;
  benefit_type: string;
  monthly_amount: string;
  counts_as_income: boolean;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
}

export interface FamilyAssessmentResponse {
  id: number;
  assessment_date: string;
  vulnerability_score: number;
  system_suggestion: string;
  final_decision: string;
  decision_reason: string | null;
  exception_reason: string | null;
  approved_by_user_id: number;
  co_approved_by_user_id: number | null;
  next_revaluation_date: string | null;
  technical_notes: string | null;
}

export interface FamilyListItemResponse {
  id: number;
  internal_code: string;
  status: string;
  registration_date: string;
  last_evaluation_date: string | null;
  next_revaluation_date: string | null;
  monthly_income_total: string;
  monthly_essential_expenses: string;
  income_per_capita: string;
  receives_government_assistance: boolean;
  housing_type: string | null;
  has_water_supply: boolean;
  has_electricity: boolean;
  has_sanitation: boolean;
  rooms_count: number;
  bedrooms_count: number;
  zip_code: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  reference_point: string | null;
  total_residents: number;
  total_adults: number;
  total_children: number;
  total_elderly: number;
  total_babies: number;
  has_pregnant_member: boolean;
  has_disabled_member: boolean;
  has_chronic_illness_member: boolean;
  has_unemployed_member: boolean;
  needs_extra_support: boolean;
  social_notes: string | null;
  internal_notes: string | null;
  contacts: FamilyContactResponse[];
}

export interface FamilyDetailResponse extends FamilyListItemResponse {
  people: FamilyPersonResponse[];
  benefits: FamilyBenefitResponse[];
  assessments: FamilyAssessmentResponse[];
}

export interface FamilyContactCreatePayload {
  contact_name: string | null;
  phone: string | null;
  contact_type: string;
  is_whatsapp: boolean;
  notes: string | null;
}

export interface FamilyCreatePayload {
  internal_code: string;
  status: string;
  registration_date: string;
  last_evaluation_date: string | null;
  next_revaluation_date: string | null;
  monthly_income_total: number;
  monthly_essential_expenses: number;
  income_per_capita: number;
  receives_government_assistance: boolean;
  housing_type: string | null;
  has_water_supply: boolean;
  has_electricity: boolean;
  has_sanitation: boolean;
  rooms_count: number;
  bedrooms_count: number;
  zip_code: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  reference_point: string | null;
  total_residents: number;
  total_adults: number;
  total_children: number;
  total_elderly: number;
  total_babies: number;
  has_pregnant_member: boolean;
  has_disabled_member: boolean;
  has_chronic_illness_member: boolean;
  has_unemployed_member: boolean;
  needs_extra_support: boolean;
  social_notes: string | null;
  internal_notes: string | null;
  contacts: FamilyContactCreatePayload[];
}