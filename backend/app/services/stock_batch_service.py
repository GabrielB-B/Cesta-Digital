from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.item import Item
from app.models.stock_batch import StockBatch
from app.models.user import User
from app.schemas.stock_batch import StockBatchCreate
from app.services.audit_log_service import record_audit_log
from app.services.stock_availability_policy import validate_stock_batch_dates


def create_stock_batch(
    db: Session,
    payload: StockBatchCreate,
    current_user: User,
) -> StockBatch:
    item = db.get(Item, payload.item_id)
    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Item nao encontrado.",
        )

    if not item.is_active:
        raise HTTPException(
            status_code=400,
            detail="Itens inativos nao podem receber novos lotes.",
        )

    try:
        validate_stock_batch_dates(
            tracks_expiration=item.tracks_expiration,
            entry_date=payload.entry_date,
            expiration_date=payload.expiration_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    batch = StockBatch(
        item_id=payload.item_id,
        source_type=payload.source_type,
        entry_quantity=payload.entry_quantity,
        current_quantity=payload.entry_quantity,
        entry_date=payload.entry_date,
        expiration_date=payload.expiration_date,
        estimated_unit_value=payload.estimated_unit_value,
        notes=payload.notes,
        created_by_user_id=current_user.id,
    )

    db.add(batch)
    db.flush()
    record_audit_log(
        db,
        event_type="stock.batch.created",
        actor_user=current_user,
        entity_type="stock_batch",
        entity_id=batch.id,
        details={
            "item_id": batch.item_id,
            "entry_quantity": int(batch.entry_quantity),
            "source_type": batch.source_type,
        },
    )
    db.commit()
    db.refresh(batch)
    return batch


def list_stock_batches(
    db: Session,
    *,
    item_id: int | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[StockBatch], int]:
    filters = []
    if item_id is not None:
        filters.append(StockBatch.item_id == item_id)

    total_stmt = select(func.count(StockBatch.id))
    stmt = select(StockBatch).order_by(StockBatch.id.desc())

    if filters:
        total_stmt = total_stmt.where(*filters)
        stmt = stmt.where(*filters)

    total = db.scalar(total_stmt) or 0

    if limit is not None:
        stmt = stmt.offset(offset).limit(limit)

    return list(db.scalars(stmt).all()), total
