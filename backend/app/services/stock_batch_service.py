from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.item import Item
from app.models.stock_batch import StockBatch
from app.models.user import User
from app.schemas.stock_batch import StockBatchCreate
from app.services.audit_log_service import record_audit_log


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

    if item.tracks_expiration and payload.expiration_date is None:
        raise HTTPException(
            status_code=400,
            detail="Este item exige data de validade.",
        )

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


def list_stock_batches(db: Session) -> list[StockBatch]:
    stmt = select(StockBatch).order_by(StockBatch.id.desc())
    return list(db.scalars(stmt).all())
