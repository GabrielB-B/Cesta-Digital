from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.family import Family
from app.models.person import Person
from app.models.user import User
from app.schemas.person import PersonCreate, PersonUpdate
from app.services.audit_log_service import record_audit_log
from app.services.family_service import recalculate_family_summary


def _ensure_unique_family_responsible(
    db: Session,
    family_id: int,
    is_family_responsible: bool,
    current_person_id: int | None = None,
) -> None:
    if not is_family_responsible:
        return

    stmt = select(Person).where(
        Person.family_id == family_id,
        Person.is_family_responsible.is_(True),
    )
    if current_person_id is not None:
        stmt = stmt.where(Person.id != current_person_id)

    existing_responsible = db.scalar(stmt)
    if existing_responsible is not None:
        raise HTTPException(
            status_code=409,
            detail="Esta familia ja possui outra pessoa marcada como responsavel.",
        )


def create_person_for_family(
    db: Session,
    family_id: int,
    payload: PersonCreate,
    current_user: User,
) -> Person:
    family = db.get(Family, family_id)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Familia nao encontrada.",
        )

    _ensure_unique_family_responsible(
        db,
        family_id,
        payload.is_family_responsible,
    )

    person = Person(
        family_id=family_id,
        full_name=payload.full_name,
        birth_date=payload.birth_date,
        kinship=payload.kinship,
        gender=payload.gender,
        phone=payload.phone,
        education_level=payload.education_level,
        is_currently_studying=payload.is_currently_studying,
        is_currently_working=payload.is_currently_working,
        occupation=payload.occupation,
        individual_income=payload.individual_income,
        has_disability=payload.has_disability,
        has_chronic_illness=payload.has_chronic_illness,
        is_pregnant=payload.is_pregnant,
        is_nursing_mother=payload.is_nursing_mother,
        notes=payload.notes,
        is_family_responsible=payload.is_family_responsible,
    )

    db.add(person)
    db.flush()

    recalculate_family_summary(db, family)
    family.updated_by_user_id = current_user.id
    record_audit_log(
        db,
        event_type="family.person.created",
        actor_user=current_user,
        entity_type="person",
        entity_id=person.id,
        details={
            "family_id": family.id,
            "full_name": person.full_name,
            "is_family_responsible": person.is_family_responsible,
        },
    )

    db.commit()
    db.refresh(person)
    return person


def list_people_by_family(db: Session, family_id: int) -> list[Person]:
    family = db.get(Family, family_id)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Familia nao encontrada.",
        )

    stmt = (
        select(Person)
        .where(Person.family_id == family_id)
        .order_by(Person.full_name.asc())
    )
    return list(db.scalars(stmt).all())


def update_person(
    db: Session,
    person_id: int,
    payload: PersonUpdate,
    current_user: User,
) -> Person:
    person = db.get(Person, person_id)
    if person is None:
        raise HTTPException(
            status_code=404,
            detail="Pessoa nao encontrada.",
        )

    _ensure_unique_family_responsible(
        db,
        person.family_id,
        payload.is_family_responsible,
        current_person_id=person.id,
    )

    person.full_name = payload.full_name
    person.birth_date = payload.birth_date
    person.kinship = payload.kinship
    person.gender = payload.gender
    person.phone = payload.phone
    person.education_level = payload.education_level
    person.is_currently_studying = payload.is_currently_studying
    person.is_currently_working = payload.is_currently_working
    person.occupation = payload.occupation
    person.individual_income = payload.individual_income
    person.has_disability = payload.has_disability
    person.has_chronic_illness = payload.has_chronic_illness
    person.is_pregnant = payload.is_pregnant
    person.is_nursing_mother = payload.is_nursing_mother
    person.notes = payload.notes
    person.is_family_responsible = payload.is_family_responsible

    family = db.get(Family, person.family_id)
    recalculate_family_summary(db, family)
    family.updated_by_user_id = current_user.id
    record_audit_log(
        db,
        event_type="family.person.updated",
        actor_user=current_user,
        entity_type="person",
        entity_id=person.id,
        details={
            "family_id": person.family_id,
            "full_name": person.full_name,
            "is_family_responsible": person.is_family_responsible,
        },
    )

    db.commit()
    db.refresh(person)
    return person


def delete_person(db: Session, person_id: int, current_user: User) -> None:
    person = db.get(Person, person_id)
    if person is None:
        raise HTTPException(
            status_code=404,
            detail="Pessoa nao encontrada.",
        )

    family = db.get(Family, person.family_id)
    full_name = person.full_name

    db.delete(person)
    db.flush()

    recalculate_family_summary(db, family)
    family.updated_by_user_id = current_user.id
    record_audit_log(
        db,
        event_type="family.person.deleted",
        actor_user=current_user,
        entity_type="person",
        entity_id=person_id,
        details={
            "family_id": family.id,
            "full_name": full_name,
        },
    )

    db.commit()
