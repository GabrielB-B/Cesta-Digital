from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.benefit import Benefit
from app.models.family import Family
from app.models.person import Person
from app.models.user import User
from app.schemas.benefit import BenefitCreate, BenefitUpdate
from app.services.audit_log_service import record_audit_log
from app.services.family_service import recalculate_family_summary


def _validate_family_and_person(
    db: Session,
    family_id: int,
    person_id: int | None,
) -> Family:
    family = db.get(Family, family_id)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Familia nao encontrada.",
        )

    if person_id is not None:
        person = db.get(Person, person_id)
        if person is None or person.family_id != family_id:
            raise HTTPException(
                status_code=400,
                detail="A pessoa informada nao pertence a esta familia.",
            )

    return family


def create_benefit(
    db: Session,
    family_id: int,
    payload: BenefitCreate,
    current_user: User,
) -> Benefit:
    family = _validate_family_and_person(db, family_id, payload.person_id)
    previous_income_total = family.monthly_income_total

    benefit = Benefit(
        family_id=family_id,
        person_id=payload.person_id,
        benefit_type=payload.benefit_type,
        monthly_amount=payload.monthly_amount,
        counts_as_income=payload.counts_as_income,
        is_active=payload.is_active,
        start_date=payload.start_date,
        end_date=payload.end_date,
        notes=payload.notes,
    )

    db.add(benefit)
    db.flush()

    recalculate_family_summary(
        db,
        family,
        minimum_income_total=previous_income_total,
    )
    family.updated_by_user_id = current_user.id
    record_audit_log(
        db,
        event_type="family.benefit.created",
        actor_user=current_user,
        entity_type="benefit",
        entity_id=benefit.id,
        details={
            "family_id": family.id,
            "benefit_type": benefit.benefit_type,
            "is_active": benefit.is_active,
        },
    )

    db.commit()
    db.refresh(benefit)
    return benefit


def list_benefits_by_family(db: Session, family_id: int) -> list[Benefit]:
    family = db.get(Family, family_id)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Familia nao encontrada.",
        )

    stmt = (
        select(Benefit)
        .where(Benefit.family_id == family_id)
        .order_by(Benefit.id.asc())
    )
    return list(db.scalars(stmt).all())


def update_benefit(
    db: Session,
    benefit_id: int,
    payload: BenefitUpdate,
    current_user: User,
) -> Benefit:
    benefit = db.get(Benefit, benefit_id)
    if benefit is None:
        raise HTTPException(
            status_code=404,
            detail="Beneficio nao encontrado.",
        )

    family = _validate_family_and_person(db, benefit.family_id, payload.person_id)

    benefit.person_id = payload.person_id
    benefit.benefit_type = payload.benefit_type
    benefit.monthly_amount = payload.monthly_amount
    benefit.counts_as_income = payload.counts_as_income
    benefit.is_active = payload.is_active
    benefit.start_date = payload.start_date
    benefit.end_date = payload.end_date
    benefit.notes = payload.notes

    recalculate_family_summary(db, family)
    family.updated_by_user_id = current_user.id
    record_audit_log(
        db,
        event_type="family.benefit.updated",
        actor_user=current_user,
        entity_type="benefit",
        entity_id=benefit.id,
        details={
            "family_id": family.id,
            "benefit_type": benefit.benefit_type,
            "is_active": benefit.is_active,
        },
    )

    db.commit()
    db.refresh(benefit)
    return benefit


def delete_benefit(db: Session, benefit_id: int, current_user: User) -> None:
    benefit = db.get(Benefit, benefit_id)
    if benefit is None:
        raise HTTPException(
            status_code=404,
            detail="Beneficio nao encontrado.",
        )

    family = db.get(Family, benefit.family_id)
    benefit_type = benefit.benefit_type

    db.delete(benefit)
    db.flush()

    recalculate_family_summary(db, family)
    family.updated_by_user_id = current_user.id
    record_audit_log(
        db,
        event_type="family.benefit.deleted",
        actor_user=current_user,
        entity_type="benefit",
        entity_id=benefit_id,
        details={
            "family_id": family.id,
            "benefit_type": benefit_type,
        },
    )

    db.commit()
