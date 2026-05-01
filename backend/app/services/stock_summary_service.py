from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.item import Item
from app.models.item_category import ItemCategory
from app.models.stock_batch import StockBatch


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
            func.coalesce(func.sum(StockBatch.current_quantity), 0).label("total_quantity"),
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
        if item["is_below_minimum"]
    ]

    return alerts
