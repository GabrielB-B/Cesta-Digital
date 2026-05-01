from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.family import Family
from app.models.social_assessment import SocialAssessment
from app.models.user import User
from app.schemas.social_assessment import SocialAssessmentCreate
from app.services.audit_log_service import record_audit_log
from app.services.eligibility_service import calculate_system_suggestion


def create_social_assessment(
    db: Session,
    family_id: int,
    payload: SocialAssessmentCreate,
    current_user: User,
) -> SocialAssessment:
    family = db.get(Family, family_id)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Familia nao encontrada.",
        )

    eligibility = calculate_system_suggestion(db, family)
    system_suggestion = eligibility["system_suggestion"]

    diverges_from_system = payload.final_decision != system_suggestion
    has_override_reason = bool(
        (payload.decision_reason and payload.decision_reason.strip())
        or (payload.exception_reason and payload.exception_reason.strip())
    )

    if diverges_from_system and not has_override_reason:
        raise HTTPException(
            status_code=422,
            detail=(
                "Quando a decisao final divergir da sugestao automatica, "
                "e obrigatorio informar o motivo da decisao ou da excecao."
            ),
        )

    if payload.co_approved_by_user_id is not None:
        if payload.co_approved_by_user_id == current_user.id:
            raise HTTPException(
                status_code=422,
                detail="O coaprovador deve ser diferente do aprovador principal.",
            )

        co_approver = db.get(User, payload.co_approved_by_user_id)
        if co_approver is None or not co_approver.is_active:
            raise HTTPException(
                status_code=422,
                detail="Coaprovador nao encontrado ou inativo.",
            )

    assessment = SocialAssessment(
        family_id=family_id,
        assessment_date=payload.assessment_date,
        monthly_income_total_at_time=family.monthly_income_total,
        income_per_capita_at_time=family.income_per_capita,
        vulnerability_score=payload.vulnerability_score,
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

    family.status = payload.final_decision
    family.last_evaluation_date = payload.assessment_date
    family.next_revaluation_date = payload.next_revaluation_date
    family.updated_by_user_id = current_user.id

    db.flush()
    record_audit_log(
        db,
        event_type="social_assessment.created",
        actor_user=current_user,
        entity_type="social_assessment",
        entity_id=assessment.id,
        details={
            "family_id": family.id,
            "system_suggestion": system_suggestion,
            "final_decision": payload.final_decision,
            "vulnerability_score": payload.vulnerability_score,
        },
    )

    db.commit()
    db.refresh(assessment)
    return assessment


def list_social_assessments_by_family(
    db: Session,
    family_id: int,
) -> list[SocialAssessment]:
    family = db.get(Family, family_id)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Familia nao encontrada.",
        )

    stmt = (
        select(SocialAssessment)
        .where(SocialAssessment.family_id == family_id)
        .order_by(SocialAssessment.assessment_date.desc(), SocialAssessment.id.desc())
    )
    return list(db.scalars(stmt).all())
