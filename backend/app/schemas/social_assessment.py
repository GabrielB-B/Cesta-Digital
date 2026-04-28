from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator


ALLOWED_FINAL_DECISIONS = {
    "apta_recorrente",
    "apta_emergencial",
    "em_analise",
    "inapta",
    "inativa",
}


class EligibilityPreviewResponse(BaseModel):
    """Preview da elegibilidade automática da família."""

    family_id: int
    internal_code: str
    income_per_capita: Decimal
    extreme_poverty_limit: Decimal
    poverty_limit: Decimal
    system_suggestion: str
    poverty_band: str
    economic_reason: str
    social_weight_score: int
    social_aggravating_factors: list[str]
    priority_level: str


class SocialAssessmentCreate(BaseModel):
    """Payload de criação de avaliação social."""

    assessment_date: date
    vulnerability_score: int
    final_decision: str
    decision_reason: str | None = None
    exception_reason: str | None = None
    co_approved_by_user_id: int | None = None
    next_revaluation_date: date | None = None
    technical_notes: str | None = None

    @field_validator("final_decision")
    @classmethod
    def validate_final_decision(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in ALLOWED_FINAL_DECISIONS:
            raise ValueError("Decisão final inválida.")
        return value


class SocialAssessmentResponse(BaseModel):
    """Resposta serializada da avaliação social."""

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
