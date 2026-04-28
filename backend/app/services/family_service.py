from datetime import date
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.benefit import Benefit
from app.models.family import Family
from app.models.family_contact import FamilyContact
from app.models.person import Person
from app.models.social_assessment import SocialAssessment
from app.models.user import User
from app.schemas.family import FamilyCreate
from app.services.audit_log_service import record_audit_log


def calculate_age(birth_date: date) -> int:
    today = date.today()
    age = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age


def recalculate_family_summary(db: Session, family: Family) -> None:
    people_stmt = select(Person).where(Person.family_id == family.id)
    people = list(db.scalars(people_stmt).all())

    benefits_stmt = select(Benefit).where(
        Benefit.family_id == family.id,
        Benefit.is_active.is_(True),
        Benefit.counts_as_income.is_(True),
    )
    benefits = list(db.scalars(benefits_stmt).all())

    total_residents = len(people)
    total_adults = 0
    total_children = 0
    total_elderly = 0
    total_babies = 0

    monthly_income_total = Decimal("0.00")
    has_disabled_member = False
    has_chronic_illness_member = False
    has_pregnant_member = False
    has_unemployed_member = False

    for person in people:
        age = calculate_age(person.birth_date)

        if age <= 2:
            total_babies += 1
        elif age <= 17:
            total_children += 1
        elif age >= 60:
            total_elderly += 1
        else:
            total_adults += 1

        monthly_income_total += Decimal(person.individual_income or 0)

        if person.has_disability:
            has_disabled_member = True

        if person.has_chronic_illness:
            has_chronic_illness_member = True

        if person.is_pregnant:
            has_pregnant_member = True

        if age >= 18 and not person.is_currently_working:
            has_unemployed_member = True

    for benefit in benefits:
        monthly_income_total += Decimal(benefit.monthly_amount or 0)

    family.total_residents = total_residents if total_residents > 0 else 1
    family.total_adults = total_adults
    family.total_children = total_children
    family.total_elderly = total_elderly
    family.total_babies = total_babies

    family.monthly_income_total = monthly_income_total
    family.income_per_capita = (
        monthly_income_total / family.total_residents
        if family.total_residents > 0
        else Decimal("0.00")
    )

    family.has_disabled_member = has_disabled_member
    family.has_chronic_illness_member = has_chronic_illness_member
    family.has_pregnant_member = has_pregnant_member
    family.has_unemployed_member = has_unemployed_member


def create_family(db: Session, payload: FamilyCreate, current_user: User) -> Family:
    existing_family = db.scalar(
        select(Family).where(Family.internal_code == payload.internal_code)
    )
    if existing_family is not None:
        raise HTTPException(
            status_code=409,
            detail="Ja existe uma familia cadastrada com esse codigo interno.",
        )

    family = Family(
        internal_code=payload.internal_code,
        status=payload.status,
        registration_date=payload.registration_date,
        last_evaluation_date=payload.last_evaluation_date,
        next_revaluation_date=payload.next_revaluation_date,
        created_by_user_id=current_user.id,
        updated_by_user_id=current_user.id,
        monthly_income_total=payload.monthly_income_total,
        monthly_essential_expenses=payload.monthly_essential_expenses,
        income_per_capita=payload.income_per_capita,
        receives_government_assistance=payload.receives_government_assistance,
        housing_type=payload.housing_type,
        has_water_supply=payload.has_water_supply,
        has_electricity=payload.has_electricity,
        has_sanitation=payload.has_sanitation,
        rooms_count=payload.rooms_count,
        bedrooms_count=payload.bedrooms_count,
        zip_code=payload.zip_code,
        street=payload.street,
        number=payload.number,
        complement=payload.complement,
        neighborhood=payload.neighborhood,
        city=payload.city,
        state=payload.state,
        reference_point=payload.reference_point,
        total_residents=payload.total_residents,
        total_adults=payload.total_adults,
        total_children=payload.total_children,
        total_elderly=payload.total_elderly,
        total_babies=payload.total_babies,
        has_pregnant_member=payload.has_pregnant_member,
        has_disabled_member=payload.has_disabled_member,
        has_chronic_illness_member=payload.has_chronic_illness_member,
        has_unemployed_member=payload.has_unemployed_member,
        needs_extra_support=payload.needs_extra_support,
        social_notes=payload.social_notes,
        internal_notes=payload.internal_notes,
        attends_church=payload.attends_church,
        church_name=payload.church_name,
        community_relationship=payload.community_relationship,
        responsible_education_level=payload.responsible_education_level,
        has_internet_access=payload.has_internet_access,
        has_mobile_phone=payload.has_mobile_phone,
        has_computer=payload.has_computer,
    )

    for contact in payload.contacts:
        family.contacts.append(
            FamilyContact(
                contact_name=contact.contact_name,
                phone=contact.phone,
                contact_type=contact.contact_type,
                is_whatsapp=contact.is_whatsapp,
                notes=contact.notes,
            )
        )

    db.add(family)
    db.flush()
    record_audit_log(
        db,
        event_type="family.created",
        actor_user=current_user,
        entity_type="family",
        entity_id=family.id,
        details={
            "internal_code": family.internal_code,
            "status": family.status,
            "city": family.city,
            "state": family.state,
        },
    )
    db.commit()
    db.refresh(family)

    return get_family_detail(db, family.id)


def list_families(db: Session) -> list[Family]:
    stmt = (
        select(Family)
        .options(
            selectinload(Family.contacts),
            selectinload(Family.people),
        )
        .order_by(Family.id.desc())
    )
    return list(db.scalars(stmt).all())


def get_family_detail(db: Session, family_id: int) -> Family:
    stmt = (
        select(Family)
        .options(
            selectinload(Family.contacts),
            selectinload(Family.people),
            selectinload(Family.benefits),
            selectinload(Family.assessments),
        )
        .where(Family.id == family_id)
    )

    family = db.scalar(stmt)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Familia nao encontrada.",
        )

    return family
