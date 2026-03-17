from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.family import Family
from app.models.social_assessment import SocialAssessment
from app.models.user import User
from app.schemas.social_assessment import (
    SocialAssessmentCreate,
    SocialAssessmentUpdate,
)


def calculate_vulnerability_score(family: Family) -> int:
    """
    Calcula uma pontuação simples de vulnerabilidade com base
    nos indicadores consolidados da família.
    """
    score = 0

    income_per_capita = Decimal(family.income_per_capita or 0)

    if income_per_capita <= Decimal("300.00"):
        score += 4
    elif income_per_capita <= Decimal("600.00"):
        score += 2

    if family.has_disabled_member:
        score += 2

    if family.has_chronic_illness_member:
        score += 2

    if family.has_pregnant_member:
        score += 1

    if family.has_unemployed_member:
        score += 1

    if not family.has_sanitation:
        score += 1

    if not family.has_water_supply:
        score += 1

    if not family.has_electricity:
        score += 1

    if family.needs_extra_support:
        score += 1

    return score


def calculate_system_suggestion(family: Family, vulnerability_score: int) -> str:
    """
    Gera a sugestão automática do sistema com base
    na renda per capita e na pontuação de vulnerabilidade.
    """
    income_per_capita = Decimal(family.income_per_capita or 0)

    if income_per_capita <= Decimal("300.00") or vulnerability_score >= 6:
        return "apta_recorrente"

    if income_per_capita <= Decimal("600.00") or vulnerability_score >= 3:
        return "apta_emergencial"

    if income_per_capita > Decimal("600.00") and vulnerability_score <= 1:
        return "inapta"

    return "em_analise"


def _validate_co_approver(db: Session, co_approved_by_user_id: int | None) -> None:
    """Valida se o coaprovador informado existe."""
    if co_approved_by_user_id is None:
        return

    co_approver = db.get(User, co_approved_by_user_id)
    if co_approver is None:
        raise HTTPException(
            status_code=400,
            detail="Coaprovador informado não existe.",
        )


def _validate_exception_reason(
    final_decision: str,
    system_suggestion: str,
    exception_reason: str | None,
) -> None:
    """Exige motivo de exceção quando a decisão diverge da sugestão do sistema."""
    if final_decision != system_suggestion and not exception_reason:
        raise HTTPException(
            status_code=400,
            detail=(
                "Quando a decisão final for diferente da sugestão do sistema, "
                "o motivo da exceção deve ser informado."
            ),
        )


def _sync_family_with_latest_assessment(db: Session, family: Family) -> None:
    """
    Atualiza o status e as datas da família com base
    na avaliação social mais recente.
    """
    stmt = (
        select(SocialAssessment)
        .where(SocialAssessment.family_id == family.id)
        .order_by(
            SocialAssessment.assessment_date.desc(),
            SocialAssessment.id.desc(),
        )
    )
    latest_assessment = db.scalar(stmt)

    if latest_assessment is None:
        return

    family.status = latest_assessment.final_decision
    family.last_evaluation_date = latest_assessment.assessment_date
    family.next_revaluation_date = latest_assessment.next_revaluation_date


def create_social_assessment(
    db: Session,
    family_id: int,
    payload: SocialAssessmentCreate,
    current_user: User,
) -> SocialAssessment:
    """
    Cria uma avaliação social, registra snapshot da renda atual,
    calcula sugestão automática e atualiza o status da família.
    """
    family = db.get(Family, family_id)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Família não encontrada.",
        )

    _validate_co_approver(db, payload.co_approved_by_user_id)

    vulnerability_score = calculate_vulnerability_score(family)
    system_suggestion = calculate_system_suggestion(family, vulnerability_score)

    _validate_exception_reason(
        payload.final_decision,
        system_suggestion,
        payload.exception_reason,
    )

    assessment = SocialAssessment(
        family_id=family_id,
        assessment_date=payload.assessment_date,
        monthly_income_total_at_time=family.monthly_income_total,
        income_per_capita_at_time=family.income_per_capita,
        vulnerability_score=vulnerability_score,
        system_suggestion=system_suggestion,
        final_decision=payload.final_decision,
        decision_reason=payload.decision_reason,
        exception_reason=payload.exception_reason,
        approved_by_user_id=current_user.id,
        co_approved_by_user_id=payload.co_approved_by_user_id,
        next_revaluation_date=payload.next_revaluation_date,
        technical_notes=payload.technical_notes,
    )

    db.add(assessment)
    db.flush()

    family.updated_by_user_id = current_user.id
    _sync_family_with_latest_assessment(db, family)

    db.commit()
    db.refresh(assessment)
    return assessment


def list_social_assessments_by_family(
    db: Session,
    family_id: int,
) -> list[SocialAssessment]:
    """Lista o histórico de avaliações sociais de uma família."""
    family = db.get(Family, family_id)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Família não encontrada.",
        )

    stmt = (
        select(SocialAssessment)
        .where(SocialAssessment.family_id == family_id)
        .order_by(SocialAssessment.assessment_date.desc(), SocialAssessment.id.desc())
    )
    return list(db.scalars(stmt).all())


def get_social_assessment(db: Session, assessment_id: int) -> SocialAssessment:
    """Busca uma avaliação social pelo id."""
    assessment = db.get(SocialAssessment, assessment_id)
    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail="Avaliação social não encontrada.",
        )
    return assessment


def update_social_assessment(
    db: Session,
    assessment_id: int,
    payload: SocialAssessmentUpdate,
    current_user: User,
) -> SocialAssessment:
    """
    Atualiza uma avaliação social existente e sincroniza a família
    com a avaliação mais recente após a alteração.
    """
    assessment = db.get(SocialAssessment, assessment_id)
    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail="Avaliação social não encontrada.",
        )

    family = db.get(Family, assessment.family_id)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Família não encontrada.",
        )

    _validate_co_approver(db, payload.co_approved_by_user_id)

    vulnerability_score = calculate_vulnerability_score(family)
    system_suggestion = calculate_system_suggestion(family, vulnerability_score)

    _validate_exception_reason(
        payload.final_decision,
        system_suggestion,
        payload.exception_reason,
    )

    assessment.assessment_date = payload.assessment_date
    assessment.monthly_income_total_at_time = family.monthly_income_total
    assessment.income_per_capita_at_time = family.income_per_capita
    assessment.vulnerability_score = vulnerability_score
    assessment.system_suggestion = system_suggestion
    assessment.final_decision = payload.final_decision
    assessment.decision_reason = payload.decision_reason
    assessment.exception_reason = payload.exception_reason
    assessment.co_approved_by_user_id = payload.co_approved_by_user_id
    assessment.next_revaluation_date = payload.next_revaluation_date
    assessment.technical_notes = payload.technical_notes

    family.updated_by_user_id = current_user.id
    _sync_family_with_latest_assessment(db, family)

    db.commit()
    db.refresh(assessment)
    return assessment