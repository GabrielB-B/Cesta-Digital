from datetime import date
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.family import Family
from app.models.person import Person


def get_family_or_404(db: Session, family_id: int) -> Family:
    """Busca uma família e lança 404 se não existir."""
    family = db.get(Family, family_id)
    if family is None:
        raise HTTPException(
            status_code=404,
            detail="Família não encontrada.",
        )
    return family


def _calculate_age(birth_date: date) -> int:
    """Calcula idade a partir da data de nascimento."""
    today = date.today()
    age = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age


def _calculate_social_weight(db: Session, family: Family) -> dict:
    """
    Calcula o score social complementar da família.

    Importante:
    - este score NÃO altera a fórmula da renda per capita
    - ele serve como agravante social para a liderança
    """
    people = list(
        db.scalars(
            select(Person).where(Person.family_id == family.id)
        ).all()
    )

    score = 0
    factors: list[str] = []

    elderly_count = sum(1 for person in people if _calculate_age(person.birth_date) >= 60)
    if elderly_count > 0:
        elderly_points = elderly_count * 2
        score += elderly_points
        factors.append(f"{elderly_count} idoso(s) na família (+{elderly_points})")

    disabled_count = sum(1 for person in people if person.has_disability)
    if disabled_count > 0:
        disability_points = disabled_count * 3
        score += disability_points
        factors.append(
            f"{disabled_count} pessoa(s) com deficiência (+{disability_points})"
        )

    chronic_count = sum(1 for person in people if person.has_chronic_illness)
    if chronic_count > 0:
        chronic_points = chronic_count * 2
        score += chronic_points
        factors.append(f"{chronic_count} doença(s) crônica(s) (+{chronic_points})")

    pregnant_count = sum(1 for person in people if person.is_pregnant)
    if pregnant_count > 0:
        pregnant_points = pregnant_count * 2
        score += pregnant_points
        factors.append(f"{pregnant_count} gestante(s) (+{pregnant_points})")

    nursing_count = sum(1 for person in people if person.is_nursing_mother)
    if nursing_count > 0:
        nursing_points = nursing_count * 1
        score += nursing_points
        factors.append(f"{nursing_count} lactante(s) (+{nursing_points})")

    if family.total_children > 0:
        children_points = family.total_children * 1
        score += children_points
        factors.append(f"{family.total_children} criança(s) (+{children_points})")

    if family.total_babies > 0:
        babies_points = family.total_babies * 1
        score += babies_points
        factors.append(f"{family.total_babies} bebê(s) (+{babies_points})")

    if family.has_unemployed_member:
        score += 2
        factors.append("Há desemprego na família (+2)")

    if not family.has_sanitation:
        score += 1
        factors.append("Sem saneamento adequado (+1)")

    if not family.has_water_supply:
        score += 1
        factors.append("Sem abastecimento regular de água (+1)")

    if not family.has_electricity:
        score += 1
        factors.append("Sem energia elétrica (+1)")

    if family.needs_extra_support:
        score += 2
        factors.append("Necessidade extra de apoio (+2)")

    if score >= 8:
        priority_level = "alta"
    elif score >= 4:
        priority_level = "media"
    else:
        priority_level = "baixa"

    return {
        "social_weight_score": score,
        "social_aggravating_factors": factors,
        "priority_level": priority_level,
    }


def calculate_system_suggestion(db: Session, family: Family) -> dict:
    """
    Calcula a sugestão automática principal do sistema com base
    na renda per capita, e agrega o score social como camada complementar.
    """
    income_per_capita = Decimal(family.income_per_capita or 0)
    extreme_limit = Decimal(settings.extreme_poverty_max_income_per_capita)
    poverty_limit = Decimal(settings.poverty_max_income_per_capita)

    if income_per_capita <= extreme_limit:
        economic = {
            "system_suggestion": "apta_recorrente",
            "poverty_band": "extrema_pobreza",
            "economic_reason": (
                "Renda per capita dentro da faixa de extrema pobreza."
            ),
        }
    elif income_per_capita <= poverty_limit:
        economic = {
            "system_suggestion": "apta_emergencial",
            "poverty_band": "pobreza",
            "economic_reason": (
                "Renda per capita dentro da faixa de pobreza."
            ),
        }
    else:
        economic = {
            "system_suggestion": "inapta",
            "poverty_band": "acima_da_linha",
            "economic_reason": (
                "Renda per capita acima da linha econômica automática do sistema."
            ),
        }

    social = _calculate_social_weight(db, family)

    return {
        "income_per_capita": income_per_capita,
        "extreme_poverty_limit": extreme_limit,
        "poverty_limit": poverty_limit,
        "system_suggestion": economic["system_suggestion"],
        "poverty_band": economic["poverty_band"],
        "economic_reason": economic["economic_reason"],
        "social_weight_score": social["social_weight_score"],
        "social_aggravating_factors": social["social_aggravating_factors"],
        "priority_level": social["priority_level"],
    }


def get_eligibility_preview(db: Session, family_id: int) -> dict:
    """Retorna o preview completo da elegibilidade automática."""
    family = get_family_or_404(db, family_id)
    result = calculate_system_suggestion(db, family)

    return {
        "family_id": family.id,
        "internal_code": family.internal_code,
        "income_per_capita": result["income_per_capita"],
        "extreme_poverty_limit": result["extreme_poverty_limit"],
        "poverty_limit": result["poverty_limit"],
        "system_suggestion": result["system_suggestion"],
        "poverty_band": result["poverty_band"],
        "economic_reason": result["economic_reason"],
        "social_weight_score": result["social_weight_score"],
        "social_aggravating_factors": result["social_aggravating_factors"],
        "priority_level": result["priority_level"],
    }
