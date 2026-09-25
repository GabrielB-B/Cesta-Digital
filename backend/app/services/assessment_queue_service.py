from datetime import date, timedelta

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session, aliased, selectinload

from app.models.family import Family
from app.models.person import Person
from app.models.social_assessment import SocialAssessment
from app.models.user import User
from app.schemas.social_assessment import AssessmentQueueStatus
from app.services.eligibility_service import calculate_system_suggestion
from app.services.stock_availability_policy import operational_today


ASSESSMENT_QUEUE_STATUSES = (
    "sem_avaliacao",
    "reavaliacao_vencida",
    "reavaliacao_proxima",
    "em_dia",
)


def _latest_assessment_projection():
    ranked_assessments = (
        select(
            SocialAssessment,
            func.row_number()
            .over(
                partition_by=SocialAssessment.family_id,
                order_by=(
                    SocialAssessment.assessment_date.desc(),
                    SocialAssessment.id.desc(),
                ),
            )
            .label("queue_rank"),
        )
        .subquery()
    )
    return ranked_assessments, aliased(SocialAssessment, ranked_assessments)


def _queue_status_expression(latest_assessment, *, reference_date: date, due_date: date):
    return case(
        (latest_assessment.id.is_(None), "sem_avaliacao"),
        (
            or_(
                latest_assessment.next_revaluation_date.is_(None),
                latest_assessment.next_revaluation_date < reference_date,
            ),
            "reavaliacao_vencida",
        ),
        (
            latest_assessment.next_revaluation_date <= due_date,
            "reavaliacao_proxima",
        ),
        else_="em_dia",
    )


def _queue_reason(
    latest_assessment: SocialAssessment | None,
    *,
    reference_date: date,
    due_date: date,
) -> str:
    if latest_assessment is None:
        return "nunca_avaliada"
    if latest_assessment.next_revaluation_date is None:
        return "prazo_nao_definido"
    if latest_assessment.next_revaluation_date < reference_date:
        return "prazo_vencido"
    if latest_assessment.next_revaluation_date <= due_date:
        return "prazo_proximo"
    return "prazo_em_dia"


def _item_queue_status(
    latest_assessment: SocialAssessment | None,
    *,
    reference_date: date,
    due_date: date,
) -> str:
    if latest_assessment is None:
        return "sem_avaliacao"
    if (
        latest_assessment.next_revaluation_date is None
        or latest_assessment.next_revaluation_date < reference_date
    ):
        return "reavaliacao_vencida"
    if latest_assessment.next_revaluation_date <= due_date:
        return "reavaliacao_proxima"
    return "em_dia"


def list_assessment_queue(
    db: Session,
    *,
    q: str | None = None,
    status: AssessmentQueueStatus | None = None,
    due_soon_days: int = 30,
    limit: int = 25,
    offset: int = 0,
    reference_date: date | None = None,
) -> dict:
    """Lista familias por urgencia de avaliacao usando uma pagina consistente."""

    operational_date = reference_date or operational_today()
    due_date = operational_date + timedelta(days=due_soon_days)
    ranked_assessments, latest_assessment = _latest_assessment_projection()
    queue_status = _queue_status_expression(
        latest_assessment,
        reference_date=operational_date,
        due_date=due_date,
    )

    filters = [Family.status != "inativa"]
    normalized_query = (q or "").strip()
    if normalized_query:
        pattern = f"%{normalized_query}%"
        filters.append(
            or_(
                Family.internal_code.ilike(pattern),
                Family.neighborhood.ilike(pattern),
                Family.city.ilike(pattern),
                Family.people.any(
                    and_(
                        Person.is_family_responsible.is_(True),
                        Person.full_name.ilike(pattern),
                    )
                ),
            )
        )

    latest_join = and_(
        latest_assessment.family_id == Family.id,
        ranked_assessments.c.queue_rank == 1,
    )

    count_stmt = (
        select(queue_status.label("queue_status"), func.count(Family.id))
        .select_from(Family)
        .outerjoin(latest_assessment, latest_join)
        .where(*filters)
        .group_by(queue_status)
    )
    counts = {queue_status_name: 0 for queue_status_name in ASSESSMENT_QUEUE_STATUSES}
    for queue_status_name, count in db.execute(count_stmt).all():
        counts[str(queue_status_name)] = int(count)

    filtered_total = counts[status] if status else sum(counts.values())
    urgency_order = case(
        (latest_assessment.id.is_(None), 0),
        (
            or_(
                latest_assessment.next_revaluation_date.is_(None),
                latest_assessment.next_revaluation_date < operational_date,
            ),
            1,
        ),
        (latest_assessment.next_revaluation_date <= due_date, 2),
        else_=3,
    )

    stmt = (
        select(Family, latest_assessment, User.name.label("approved_by_name"))
        .select_from(Family)
        .outerjoin(latest_assessment, latest_join)
        .outerjoin(User, User.id == latest_assessment.approved_by_user_id)
        .options(selectinload(Family.people))
        .where(*filters)
        .order_by(
            urgency_order.asc(),
            latest_assessment.next_revaluation_date.asc(),
            Family.registration_date.asc(),
            Family.id.asc(),
        )
        .limit(limit)
        .offset(offset)
    )
    if status:
        stmt = stmt.where(queue_status == status)

    items = []
    for family, assessment, approved_by_name in db.execute(stmt).all():
        people = list(family.people)
        responsible = next(
            (person for person in people if person.is_family_responsible),
            None,
        )
        eligibility = calculate_system_suggestion(db, family, people=people)
        items.append(
            {
                "family_id": family.id,
                "internal_code": family.internal_code,
                "responsible_name": responsible.full_name if responsible else None,
                "total_residents": family.total_residents,
                "neighborhood": family.neighborhood,
                "city": family.city,
                "state": family.state,
                "family_status": family.status,
                "queue_status": _item_queue_status(
                    assessment,
                    reference_date=operational_date,
                    due_date=due_date,
                ),
                "queue_reason": _queue_reason(
                    assessment,
                    reference_date=operational_date,
                    due_date=due_date,
                ),
                "latest_assessment_id": assessment.id if assessment else None,
                "latest_assessment_date": (
                    assessment.assessment_date if assessment else None
                ),
                "latest_system_suggestion": (
                    assessment.system_suggestion if assessment else None
                ),
                "latest_final_decision": (
                    assessment.final_decision if assessment else None
                ),
                "latest_vulnerability_score": (
                    assessment.vulnerability_score if assessment else None
                ),
                "latest_approved_by_user_id": (
                    assessment.approved_by_user_id if assessment else None
                ),
                "latest_approved_by_name": approved_by_name,
                "next_revaluation_date": (
                    assessment.next_revaluation_date if assessment else None
                ),
                "current_system_suggestion": eligibility["system_suggestion"],
                "current_social_weight_score": eligibility["social_weight_score"],
                "current_priority_level": eligibility["priority_level"],
                "current_preview_differs_from_decision": bool(
                    assessment
                    and eligibility["system_suggestion"] != assessment.final_decision
                ),
            }
        )

    summary = {**counts, "total": sum(counts.values())}
    return {
        "items": items,
        "total": filtered_total,
        "limit": limit,
        "offset": offset,
        "reference_date": operational_date,
        "due_soon_days": due_soon_days,
        "summary": summary,
    }
