from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class FamilyContactCreate(BaseModel):
    contact_name: str | None = None
    phone: str | None = None
    contact_type: str
    is_whatsapp: bool = False
    notes: str | None = None


class FamilyContactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contact_name: str | None
    phone: str | None
    contact_type: str
    is_whatsapp: bool
    notes: str | None


class FamilyPersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    birth_date: date
    kinship: str
    gender: str | None
    phone: str | None
    education_level: str | None
    is_currently_studying: bool
    is_currently_working: bool
    occupation: str | None
    individual_income: Decimal
    has_disability: bool
    has_chronic_illness: bool
    is_pregnant: bool
    is_nursing_mother: bool
    notes: str | None
    is_family_responsible: bool


class FamilyBenefitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int | None
    benefit_type: str
    monthly_amount: Decimal
    counts_as_income: bool
    is_active: bool
    start_date: date | None
    end_date: date | None
    notes: str | None


class FamilyAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_date: date
    monthly_income_total_at_time: Decimal
    income_per_capita_at_time: Decimal
    vulnerability_score: int
    system_suggestion: str
    final_decision: str
    decision_reason: str | None
    exception_reason: str | None
    approved_by_user_id: int
    co_approved_by_user_id: int | None
    next_revaluation_date: date | None
    technical_notes: str | None


class FamilyCreate(BaseModel):
    internal_code: str
    status: str

    registration_date: date
    last_evaluation_date: date | None = None
    next_revaluation_date: date | None = None

    monthly_income_total: Decimal = Decimal("0.00")
    monthly_essential_expenses: Decimal = Decimal("0.00")
    income_per_capita: Decimal = Decimal("0.00")

    receives_government_assistance: bool = False
    attends_church: bool = False
    church_name: str | None = None
    community_relationship: str | None = None
    responsible_education_level: str | None = None
    has_internet_access: bool = False
    has_mobile_phone: bool = False
    has_computer: bool = False

    housing_type: str | None = None
    has_water_supply: bool = False
    has_electricity: bool = False
    has_sanitation: bool = False

    rooms_count: int = 0
    bedrooms_count: int = 0

    zip_code: str | None = None
    street: str
    number: str
    complement: str | None = None
    neighborhood: str
    city: str
    state: str
    reference_point: str | None = None

    total_residents: int = 1
    total_adults: int = 0
    total_children: int = 0
    total_elderly: int = 0
    total_babies: int = 0

    has_pregnant_member: bool = False
    has_disabled_member: bool = False
    has_chronic_illness_member: bool = False
    has_unemployed_member: bool = False
    needs_extra_support: bool = False

    social_notes: str | None = None
    internal_notes: str | None = None

    contacts: list[FamilyContactCreate] = []

    @field_validator("internal_code")
    @classmethod
    def validate_internal_code(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("O código interno da família é obrigatório.")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        allowed = {
            "apta_recorrente",
            "apta_emergencial",
            "em_analise",
            "inapta",
            "inativa",
        }
        if value not in allowed:
            raise ValueError("Status de família inválido.")
        return value

    @field_validator("state")
    @classmethod
    def validate_state(cls, value: str) -> str:
        value = value.strip().upper()
        if len(value) != 2:
            raise ValueError("O estado deve ter 2 caracteres.")
        return value

    @model_validator(mode="after")
    def validate_totals(self):
        if self.total_residents < 1:
            raise ValueError("A família deve ter pelo menos 1 morador.")

        if any(
            number < 0
            for number in [
                self.total_adults,
                self.total_children,
                self.total_elderly,
                self.total_babies,
                self.rooms_count,
                self.bedrooms_count,
            ]
        ):
            raise ValueError("Totais e quantidades não podem ser negativos.")

        composition_sum = (
            self.total_adults
            + self.total_children
            + self.total_elderly
            + self.total_babies
        )

        if composition_sum != self.total_residents:
            raise ValueError(
                "A soma de adultos, crianças, idosos e bebês deve ser igual ao total de moradores."
            )

        return self


class FamilyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    internal_code: str
    status: str

    registration_date: date
    last_evaluation_date: date | None
    next_revaluation_date: date | None

    monthly_income_total: Decimal
    monthly_essential_expenses: Decimal
    income_per_capita: Decimal

    receives_government_assistance: bool

    housing_type: str | None
    has_water_supply: bool
    has_electricity: bool
    has_sanitation: bool
    
    attends_church: bool
    church_name: str | None
    community_relationship: str | None
    responsible_education_level: str | None
    has_internet_access: bool
    has_mobile_phone: bool
    has_computer: bool

    rooms_count: int
    bedrooms_count: int

    zip_code: str | None
    street: str
    number: str
    complement: str | None
    neighborhood: str
    city: str
    state: str
    reference_point: str | None

    total_residents: int
    total_adults: int
    total_children: int
    total_elderly: int
    total_babies: int

    has_pregnant_member: bool
    has_disabled_member: bool
    has_chronic_illness_member: bool
    has_unemployed_member: bool
    needs_extra_support: bool

    social_notes: str | None
    internal_notes: str | None

    contacts: list[FamilyContactResponse]


class FamilyDetailResponse(FamilyResponse):
    people: list[FamilyPersonResponse]
    benefits: list[FamilyBenefitResponse]
    assessments: list[FamilyAssessmentResponse]
