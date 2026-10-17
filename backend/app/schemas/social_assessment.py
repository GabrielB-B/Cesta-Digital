from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


ALLOWED_FINAL_DECISIONS = {
    "apta_recorrente",
    "apta_emergencial",
    "em_analise",
    "inapta",
    "inativa",
}


class EligibilityPreviewResponse(BaseModel):
    """Preview da elegibilidade automatica da familia."""

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
    """Payload de criacao de avaliacao social."""

    model_config = ConfigDict(extra="forbid")

    assessment_date: date
    vulnerability_score: int | None = Field(default=None, ge=0, le=100)
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
            raise ValueError("Decisao final invalida.")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if (
            self.next_revaluation_date is not None
            and self.next_revaluation_date < self.assessment_date
        ):
            raise ValueError("A proxima reavaliacao nao pode ser anterior a avaliacao.")
        return self


class SocialAssessmentResponse(BaseModel):
    """Resposta serializada da avaliacao social."""

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


AssessmentQueueStatus = Literal[
    "sem_avaliacao",
    "reavaliacao_vencida",
    "reavaliacao_proxima",
    "em_dia",
]

AssessmentQueueReason = Literal[
    "nunca_avaliada",
    "prazo_nao_definido",
    "prazo_vencido",
    "prazo_proximo",
    "prazo_em_dia",
]


class AssessmentQueueItemResponse(BaseModel):
    """Projecao operacional de uma familia na fila de elegibilidade."""

    family_id: int
    internal_code: str
    responsible_name: str | None
    total_residents: int
    neighborhood: str
    city: str
    state: str
    family_status: str
    queue_status: AssessmentQueueStatus
    queue_reason: AssessmentQueueReason
    latest_assessment_id: int | None
    latest_assessment_date: date | None
    latest_system_suggestion: str | None
    latest_final_decision: str | None
    latest_vulnerability_score: int | None
    latest_approved_by_user_id: int | None
    latest_approved_by_name: str | None
    next_revaluation_date: date | None
    current_system_suggestion: str
    current_social_weight_score: int
    current_priority_level: str
    current_preview_differs_from_decision: bool


class AssessmentQueueSummaryResponse(BaseModel):
    sem_avaliacao: int
    reavaliacao_vencida: int
    reavaliacao_proxima: int
    em_dia: int
    total: int


class AssessmentQueueResponse(BaseModel):
    items: list[AssessmentQueueItemResponse]
    total: int
    limit: int
    offset: int
    reference_date: date
    due_soon_days: int
    summary: AssessmentQueueSummaryResponse
