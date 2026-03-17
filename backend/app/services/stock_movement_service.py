from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.stock_batch import StockBatch
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.schemas.stock_movement import StockMovementCreate


NEGATIVE_MOVEMENTS = {"saida_manual", "perda_validade", "ajuste_negativo", "saida_entrega"}
POSITIVE_MOVEMENTS = {"ajuste_positivo"}

def create_stock_movement(
    db: Session,
    payload: StockMovementCreate,
    current_user: User,
) -> StockMovement:
    """
    Aplica uma movimentação sobre um lote e atualiza o saldo atual do lote.

    Regras:
    - lotes precisam existir
    - movimentações negativas não podem deixar saldo abaixo de zero
    - movimentações positivas aumentam current_quantity
    """
    batch = db.get(StockBatch, payload.batch_id)
    if batch is None:
        raise HTTPException(
            status_code=404,
            detail="Lote de estoque não encontrado.",
        )

    if payload.movement_type in NEGATIVE_MOVEMENTS:
        if payload.quantity > batch.current_quantity:
            raise HTTPException(
                status_code=400,
                detail="Quantidade maior que o saldo disponível do lote.",
            )
        batch.current_quantity -= payload.quantity

    elif payload.movement_type in POSITIVE_MOVEMENTS:
        batch.current_quantity += payload.quantity

    movement = StockMovement(
        batch_id=batch.id,
        item_id=batch.item_id,
        movement_type=payload.movement_type,
        quantity=payload.quantity,
        notes=payload.notes,
        created_by_user_id=current_user.id,
    )

    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


def list_stock_movements(db: Session) -> list[StockMovement]:
    """Lista todas as movimentações registradas no estoque."""
    stmt = select(StockMovement).order_by(StockMovement.id.desc())
    return list(db.scalars(stmt).all())