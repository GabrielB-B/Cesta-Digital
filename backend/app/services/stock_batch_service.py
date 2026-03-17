from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.item import Item
from app.models.stock_batch import StockBatch
from app.models.user import User
from app.schemas.stock_batch import StockBatchCreate


def create_stock_batch(
    db: Session,
    payload: StockBatchCreate,
    current_user: User,
) -> StockBatch:
    """
    Registra uma entrada real de item no estoque por lote.

    Regras importantes:
    - o item deve existir
    - se o item controla validade, a data de validade é obrigatória
    - current_quantity nasce igual à entry_quantity
    """
    item = db.get(Item, payload.item_id)
    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Item não encontrado.",
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
    db.commit()
    db.refresh(batch)
    return batch


def list_stock_batches(db: Session) -> list[StockBatch]:
    """Lista todos os lotes de estoque cadastrados."""
    stmt = select(StockBatch).order_by(StockBatch.id.desc())
    return list(db.scalars(stmt).all())