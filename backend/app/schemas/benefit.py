from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

MONEY_QUANTIZER = Decimal("0.01")


class BenefitBase(BaseModel):
    """Schema base para criação e atualização de benefícios."""

    person_id: int | None = None
    benefit_type: str
    monthly_amount: Decimal = Decimal("0.00")
    counts_as_income: bool = True
    is_active: bool = True
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None

    @field_validator("benefit_type")
    @classmethod
    def validate_benefit_type(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("O tipo de benefício é obrigatório.")
        return value

    @field_validator("monthly_amount")
    @classmethod
    def validate_monthly_amount(cls, value: Decimal) -> Decimal:
        if value < 0:
            raise ValueError("O valor mensal não pode ser negativo.")
        return value.quantize(MONEY_QUANTIZER)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("A data final não pode ser anterior à data inicial.")
        return self


class BenefitCreate(BenefitBase):
    """Payload para criação de benefício."""


class BenefitUpdate(BenefitBase):
    """Payload para atualização de benefício."""


class BenefitResponse(BaseModel):
    """Resposta serializada de benefício."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    family_id: int
    person_id: int | None
    benefit_type: str
    monthly_amount: Decimal
    counts_as_income: bool
    is_active: bool
    start_date: date | None
    end_date: date | None
    notes: str | None
