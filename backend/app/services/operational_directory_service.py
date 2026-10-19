from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models.basket_type import BasketType
from app.models.family import Family
from app.models.person import Person
from app.services.family_identity import family_display_name

DELIVERY_ELIGIBLE_STATUSES = {"apta_recorrente", "apta_emergencial"}


def list_operational_families(
    db: Session,
    *,
    q: str | None = None,
    eligible_only: bool = False,
    limit: int = 200,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Lista apenas os campos necessários para localizar uma família na operação."""
    responsible_name = (
        select(Person.full_name)
        .where(
            Person.family_id == Family.id,
            Person.is_family_responsible.is_(True),
        )
        .order_by(Person.id)
        .limit(1)
        .correlate(Family)
        .scalar_subquery()
    )

    filters = []
    normalized_query = (q or "").strip()
    if normalized_query:
        pattern = f"%{normalized_query}%"
        filters.append(
            or_(
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
    if eligible_only:
        filters.append(Family.status.in_(DELIVERY_ELIGIBLE_STATUSES))

    total_stmt = select(func.count(Family.id))
    list_stmt = select(
        Family.id,
        responsible_name.label("_responsible_name"),
        Family.status,
        Family.total_residents,
        Family.neighborhood,
        Family.city,
        Family.state,
    ).order_by(Family.id.desc())

    if filters:
        total_stmt = total_stmt.where(*filters)
        list_stmt = list_stmt.where(*filters)

    total = int(db.scalar(total_stmt) or 0)
    rows = db.execute(list_stmt.offset(offset).limit(limit)).mappings().all()
    items: list[dict] = []
    for row in rows:
        item = dict(row)
        item["display_name"] = family_display_name(
            item.pop("_responsible_name", None),
            item["neighborhood"],
        )
        item["eligible_for_delivery"] = item["status"] in DELIVERY_ELIGIBLE_STATUSES
        items.append(item)
    return items, total


def list_operational_basket_types(db: Session) -> list[BasketType]:
    """Retorna somente cestas ativas que podem ser selecionadas em entregas."""
    stmt = (
        select(BasketType)
        .where(BasketType.is_active.is_(True))
        .order_by(BasketType.name.asc())
    )
    return list(db.scalars(stmt).all())
