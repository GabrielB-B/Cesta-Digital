from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


ALLOWED_DECISIONS = {
    "apta_recorrente",
    "apta_emergencial",
    "em_analise",
    "inapta",
}


class SocialAssessmentBase(BaseModel):
    """Campos compartilhados entre criação e atualização de avaliação social."""

    assessment_date: date
    final_decision: str
    decision_reason: str | None = None
    exception_reason: str | None = None
    co_approved_by_user_id: int | None = None
    next_revaluation_date: date | None = None
    technical_notes: str | None = None

    @field_validator("final_decision")
    @classmethod
    def validate_final_decision(cls, value: str) -> str:
        if value not in ALLOWED_DECISIONS:
            raise ValueError("Decisão final inválida.")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if (
            self.next_revaluation_date is not None
            and self.next_revaluation_date < self.assessment_date
        ):
            raise ValueError(
                "A próxima reavaliação não pode ser anterior à data da avaliação."
            )
        return self


class SocialAssessmentCreate(SocialAssessmentBase):
    """Payload de criação de avaliação social."""


class SocialAssessmentUpdate(SocialAssessmentBase):
    """Payload de atualização de avaliação social."""


class SocialAssessmentResponse(BaseModel):
    """Resposta serializada de avaliação social."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    family_id: int
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