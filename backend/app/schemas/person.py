from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator

MONEY_QUANTIZER = Decimal("0.01")


class PersonBase(BaseModel):
    full_name: str
    birth_date: date
    kinship: str
    gender: str | None = None

    phone: str | None = None

    education_level: str | None = None
    is_currently_studying: bool = False
    is_currently_working: bool = False
    occupation: str | None = None
    individual_income: Decimal = Decimal("0.00")

    has_disability: bool = False
    has_chronic_illness: bool = False
    is_pregnant: bool = False
    is_nursing_mother: bool = False

    notes: str | None = None
    is_family_responsible: bool = False

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("O nome completo é obrigatório.")
        return value

    @field_validator("kinship")
    @classmethod
    def validate_kinship(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("O parentesco é obrigatório.")
        return value

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("A data de nascimento não pode estar no futuro.")
        return value
    @field_validator("individual_income")
    @classmethod
    def validate_individual_income(cls, value: Decimal) -> Decimal:
        if value < 0:
            raise ValueError("A renda individual nao pode ser negativa.")
        return value.quantize(MONEY_QUANTIZER)


class PersonCreate(PersonBase):
    pass


class PersonUpdate(PersonBase):
    pass


class PersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    family_id: int
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
