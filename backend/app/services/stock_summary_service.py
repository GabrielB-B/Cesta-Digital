from datetime import timedelta

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session

from app.models.item import Item
from app.models.item_category import ItemCategory
from app.models.stock_batch import StockBatch
from app.schemas.stock_summary import StockOverviewAttention
from app.services.stock_availability_policy import (
    operational_today,
    usable_stock_batch_condition,
)


def _stock_overview_aggregate(
    *,
    reference_date,
    due_date,
    q: str | None = None,
    is_active: bool | None = None,
):
    usable_condition = usable_stock_batch_condition(
        operational_date=reference_date,
    )
    received_positive_condition = and_(
        Item.is_active.is_(True),
        StockBatch.current_quantity > 0,
        StockBatch.entry_date <= reference_date,
    )
    expiring_soon_condition = and_(
        usable_condition,
        StockBatch.expiration_date.is_not(None),
        StockBatch.expiration_date <= due_date,
    )
    expired_condition = and_(
        received_positive_condition,
        StockBatch.expiration_date.is_not(None),
        StockBatch.expiration_date < reference_date,
    )
    missing_expiration_condition = and_(
        received_positive_condition,
        Item.tracks_expiration.is_(True),
        StockBatch.expiration_date.is_(None),
    )
    restricted_condition = and_(
        received_positive_condition,
        StockBatch.status.in_(("quarentena", "bloqueado")),
    )

    stmt = (
        select(
            Item.id.label("item_id"),
            Item.name.label("item_name"),
            Item.category_id.label("category_id"),
            ItemCategory.name.label("category_name"),
            Item.unit_measure.label("unit_measure"),
            Item.tracks_expiration.label("tracks_expiration"),
            Item.is_active.label("is_active"),
            Item.minimum_stock_alert.label("minimum_stock_alert"),
            func.coalesce(
                func.sum(
                    case(
                        (usable_condition, StockBatch.current_quantity),
                        else_=0,
                    )
                ),
                0,
            ).label("total_quantity"),
            func.count(StockBatch.id).label("total_batches"),
            func.min(
                case(
                    (
                        and_(
                            usable_condition,
                            StockBatch.expiration_date.is_not(None),
                        ),
                        StockBatch.expiration_date,
                    ),
                    else_=None,
                )
            ).label("next_expiration_date"),
            func.sum(case((expiring_soon_condition, 1), else_=0)).label(
                "expiring_soon_batches"
            ),
            func.sum(case((expired_condition, 1), else_=0)).label(
                "expired_batches"
            ),
            func.sum(case((missing_expiration_condition, 1), else_=0)).label(
                "missing_expiration_batches"
            ),
            func.sum(case((restricted_condition, 1), else_=0)).label(
                "restricted_batches"
            ),
        )
        .join(ItemCategory, Item.category_id == ItemCategory.id)
        .outerjoin(StockBatch, StockBatch.item_id == Item.id)
        .group_by(
            Item.id,
            Item.name,
            Item.category_id,
            ItemCategory.name,
            Item.unit_measure,
            Item.tracks_expiration,
            Item.is_active,
            Item.minimum_stock_alert,
        )
    )

    filters = []
    search_term = (q or "").strip()
    if search_term:
        normalized_term = f"%{search_term.lower()}%"
        filters.append(
            or_(
                func.lower(Item.name).like(normalized_term),
                func.lower(Item.unit_measure).like(normalized_term),
                func.lower(ItemCategory.name).like(normalized_term),
            )
        )
    if is_active is not None:
        filters.append(Item.is_active.is_(is_active))
    if filters:
        stmt = stmt.where(*filters)

    return stmt.subquery()


def _attention_condition(aggregate, attention: StockOverviewAttention | None):
    if attention == "estoque_baixo":
        return and_(
            aggregate.c.is_active.is_(True),
            aggregate.c.total_quantity < aggregate.c.minimum_stock_alert,
        )
    if attention == "vencendo_em_breve":
        return aggregate.c.expiring_soon_batches > 0
    if attention == "vencido":
        return aggregate.c.expired_batches > 0
    if attention == "validade_ausente":
        return aggregate.c.missing_expiration_batches > 0
    if attention == "restrito":
        return aggregate.c.restricted_batches > 0
    return None


def _serialize_overview_item(row) -> dict:
    total_quantity = int(row.total_quantity or 0)
    minimum_stock_alert = int(row.minimum_stock_alert or 0)
    return {
        "item_id": row.item_id,
        "item_name": row.item_name,
        "category_id": row.category_id,
        "category_name": row.category_name,
        "unit_measure": row.unit_measure,
        "tracks_expiration": row.tracks_expiration,
        "is_active": row.is_active,
        "minimum_stock_alert": minimum_stock_alert,
        "total_quantity": total_quantity,
        "total_batches": int(row.total_batches or 0),
        "is_below_minimum": total_quantity < minimum_stock_alert,
        "next_expiration_date": row.next_expiration_date,
        "expiring_soon_batches": int(row.expiring_soon_batches or 0),
        "expired_batches": int(row.expired_batches or 0),
        "missing_expiration_batches": int(row.missing_expiration_batches or 0),
        "restricted_batches": int(row.restricted_batches or 0),
    }


def get_stock_overview(
    db: Session,
    *,
    q: str | None = None,
    is_active: bool | None = None,
    attention: StockOverviewAttention | None = None,
    due_soon_days: int = 15,
    limit: int = 25,
    offset: int = 0,
    reference_date=None,
) -> dict:
    """Retorna a pagina operacional e contadores globais de estoque."""

    operational_date = reference_date or operational_today()
    due_date = operational_date + timedelta(days=due_soon_days)
    filtered_aggregate = _stock_overview_aggregate(
        reference_date=operational_date,
        due_date=due_date,
        q=q,
        is_active=is_active,
    )
    attention_condition = _attention_condition(filtered_aggregate, attention)

    total_stmt = select(func.count()).select_from(filtered_aggregate)
    page_stmt = select(filtered_aggregate)
    if attention_condition is not None:
        total_stmt = total_stmt.where(attention_condition)
        page_stmt = page_stmt.where(attention_condition)

    total = db.scalar(total_stmt) or 0
    low_stock_order = and_(
        filtered_aggregate.c.is_active.is_(True),
        filtered_aggregate.c.total_quantity
        < filtered_aggregate.c.minimum_stock_alert,
    )
    page_stmt = (
        page_stmt.order_by(
            case(
                (filtered_aggregate.c.expired_batches > 0, 0),
                (filtered_aggregate.c.missing_expiration_batches > 0, 1),
                (low_stock_order, 2),
                (filtered_aggregate.c.expiring_soon_batches > 0, 3),
                else_=4,
            ),
            filtered_aggregate.c.item_name.asc(),
        )
        .offset(offset)
        .limit(limit)
    )
    rows = db.execute(page_stmt).all()

    global_aggregate = _stock_overview_aggregate(
        reference_date=operational_date,
        due_date=due_date,
    )
    global_low_stock = and_(
        global_aggregate.c.is_active.is_(True),
        global_aggregate.c.total_quantity < global_aggregate.c.minimum_stock_alert,
    )
    summary_row = db.execute(
        select(
            func.count().label("total_items"),
            func.sum(
                case((global_aggregate.c.is_active.is_(True), 1), else_=0)
            ).label("active_items"),
            func.sum(case((global_low_stock, 1), else_=0)).label(
                "low_stock_items"
            ),
            func.sum(global_aggregate.c.expiring_soon_batches).label(
                "expiring_soon_batches"
            ),
            func.sum(global_aggregate.c.expired_batches).label("expired_batches"),
            func.sum(global_aggregate.c.missing_expiration_batches).label(
                "missing_expiration_batches"
            ),
            func.sum(global_aggregate.c.restricted_batches).label(
                "restricted_batches"
            ),
        ).select_from(global_aggregate)
    ).one()

    return {
        "items": [_serialize_overview_item(row) for row in rows],
        "total": int(total),
        "limit": limit,
        "offset": offset,
        "reference_date": operational_date,
        "due_soon_days": due_soon_days,
        "summary": {
            "total_items": int(summary_row.total_items or 0),
            "active_items": int(summary_row.active_items or 0),
            "low_stock_items": int(summary_row.low_stock_items or 0),
            "expiring_soon_batches": int(summary_row.expiring_soon_batches or 0),
            "expired_batches": int(summary_row.expired_batches or 0),
            "missing_expiration_batches": int(
                summary_row.missing_expiration_batches or 0
            ),
            "restricted_batches": int(summary_row.restricted_batches or 0),
        },
    }


def list_stock_summary(
    db: Session,
    *,
    q: str | None = None,
    is_active: bool | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """
    Consolida o estoque por item somando o saldo atual dos lotes.

    Regras:
    - itens sem lote ainda aparecem com quantidade zero
    - a soma usa current_quantity, não entry_quantity
    - o alerta é baseado em minimum_stock_alert
    """
    filters = []
    search_term = (q or "").strip()
    if search_term:
        normalized_term = f"%{search_term.lower()}%"
        filters.append(
            or_(
                func.lower(Item.name).like(normalized_term),
                func.lower(Item.unit_measure).like(normalized_term),
                func.lower(ItemCategory.name).like(normalized_term),
            )
        )

    if is_active is not None:
        filters.append(Item.is_active.is_(is_active))

    total_stmt = (
        select(func.count(Item.id))
        .join(ItemCategory, Item.category_id == ItemCategory.id)
    )
    stmt = (
        select(
            Item.id.label("item_id"),
            Item.name.label("item_name"),
            Item.category_id.label("category_id"),
            ItemCategory.name.label("category_name"),
            Item.unit_measure.label("unit_measure"),
            Item.tracks_expiration.label("tracks_expiration"),
            Item.is_active.label("is_active"),
            Item.minimum_stock_alert.label("minimum_stock_alert"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            usable_stock_batch_condition(),
                            StockBatch.current_quantity,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("total_quantity"),
            func.count(StockBatch.id).label("total_batches"),
        )
        .join(ItemCategory, Item.category_id == ItemCategory.id)
        .outerjoin(StockBatch, StockBatch.item_id == Item.id)
        .group_by(
            Item.id,
            Item.name,
            Item.category_id,
            ItemCategory.name,
            Item.unit_measure,
            Item.tracks_expiration,
            Item.is_active,
            Item.minimum_stock_alert,
        )
        .order_by(Item.name.asc())
    )

    if filters:
        total_stmt = total_stmt.where(*filters)
        stmt = stmt.where(*filters)

    total = db.scalar(total_stmt) or 0

    if limit is not None:
        stmt = stmt.offset(offset).limit(limit)

    rows = db.execute(stmt).all()

    summary = []
    for row in rows:
        total_quantity = int(row.total_quantity or 0)
        minimum_stock_alert = int(row.minimum_stock_alert or 0)

        summary.append(
            {
                "item_id": row.item_id,
                "item_name": row.item_name,
                "category_id": row.category_id,
                "category_name": row.category_name,
                "unit_measure": row.unit_measure,
                "tracks_expiration": row.tracks_expiration,
                "is_active": row.is_active,
                "minimum_stock_alert": minimum_stock_alert,
                "total_quantity": total_quantity,
                "total_batches": int(row.total_batches or 0),
                "is_below_minimum": total_quantity < minimum_stock_alert,
            }
        )

    return summary, total


def list_stock_alerts(db: Session) -> list[dict]:
    """
    Retorna apenas os itens com estoque abaixo do mínimo configurado.
    """
    summary, _ = list_stock_summary(db)

    alerts = [
        {
            "item_id": item["item_id"],
            "item_name": item["item_name"],
            "category_name": item["category_name"],
            "minimum_stock_alert": item["minimum_stock_alert"],
            "total_quantity": item["total_quantity"],
            "is_below_minimum": item["is_below_minimum"],
        }
        for item in summary
        if item["is_active"] and item["is_below_minimum"]
    ]

    return alerts
