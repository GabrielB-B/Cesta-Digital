from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.family import Family
from app.models.person import Person
from app.schemas.person import PersonCreate, PersonUpdate
from app.services.family_service import recalculate_family_summary


def create_person_for_family(
    db: Session,
    family_id: int,
    payload: PersonCreate,
) -> Person:
    """
    Cria um membro vinculado a uma família e recalcula
    os indicadores consolidados da família.
    """
    family = db.get(Family, family_id)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Família não encontrada.",
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

    db.commit()
    db.refresh(person)
    return person


def list_people_by_family(db: Session, family_id: int) -> list[Person]:
    """
    Lista os membros vinculados a uma família.
    """
    family = db.get(Family, family_id)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Família não encontrada.",
        )

    stmt = (
        select(Person)
        .where(Person.family_id == family_id)
        .order_by(Person.full_name.asc())
    )
    return list(db.scalars(stmt).all())


def update_person(db: Session, person_id: int, payload: PersonUpdate) -> Person:
    """
    Atualiza os dados de um membro e recalcula o resumo da família.
    """
    person = db.get(Person, person_id)
    if person is None:
        raise HTTPException(
            status_code=404,
            detail="Pessoa não encontrada.",
        )

    if payload.is_family_responsible:
        existing_responsible = db.scalar(
            select(Person).where(
                Person.family_id == person.family_id,
                Person.is_family_responsible.is_(True),
                Person.id != person.id,
            )
        )
        if existing_responsible is not None:
            raise HTTPException(
                status_code=409,
                detail="Esta família já possui outra pessoa marcada como responsável.",
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

    db.commit()
    db.refresh(person)
    return person


def delete_person(db: Session, person_id: int) -> None:
    person = db.get(Person, person_id)
    if person is None:
        raise HTTPException(
            status_code=404,
            detail="Pessoa não encontrada.",
        )

    family = db.get(Family, person.family_id)

    db.delete(person)
    db.flush()

    recalculate_family_summary(db, family)

    db.commit()
