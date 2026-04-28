from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.stock_batch import StockBatch
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.schemas.stock_movement import StockMovementCreate
from app.services.audit_log_service import record_audit_log


NEGATIVE_MOVEMENTS = {"saida_manual", "perda_validade", "ajuste_negativo", "saida_entrega"}
POSITIVE_MOVEMENTS = {"ajuste_positivo"}


def _get_batch_for_update(db: Session, batch_id: int) -> StockBatch:
    batch = db.scalar(
        select(StockBatch)
        .where(StockBatch.id == batch_id)
        .with_for_update()
    )
    if batch is None:
        raise HTTPException(
            status_code=404,
            detail="Lote de estoque nao encontrado.",
        )
    return batch


def create_stock_movement(
    db: Session,
    payload: StockMovementCreate,
    current_user: User,
) -> StockMovement:
    movement: StockMovement | None = None

    try:
        batch = _get_batch_for_update(db, payload.batch_id)

        if payload.movement_type in NEGATIVE_MOVEMENTS:
            if payload.quantity > batch.current_quantity:
                raise HTTPException(
                    status_code=400,
                    detail="Quantidade maior que o saldo disponivel do lote.",
                )
            batch.current_quantity -= payload.quantity
        elif payload.movement_type in POSITIVE_MOVEMENTS:
            batch.current_quantity += payload.quantity
        else:
            raise HTTPException(
                status_code=400,
                detail="Tipo de movimentacao invalido.",
            )

        movement = StockMovement(
            batch_id=batch.id,
            item_id=batch.item_id,
            movement_type=payload.movement_type,
            quantity=payload.quantity,
            notes=payload.notes,
            created_by_user_id=current_user.id,
        )

        db.add(movement)
        db.flush()
        record_audit_log(
            db,
            event_type="stock.movement.created",
            actor_user=current_user,
            entity_type="stock_movement",
            entity_id=movement.id,
            details={
                "batch_id": movement.batch_id,
                "item_id": movement.item_id,
                "movement_type": movement.movement_type,
                "quantity": movement.quantity,
            },
        )
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Nao foi possivel registrar a movimentacao de estoque.",
        ) from exc

    if movement is None:
        raise RuntimeError("A movimentacao de estoque nao foi criada.")

    db.refresh(movement)
    return movement


def list_stock_movements(db: Session) -> list[StockMovement]:
    stmt = select(StockMovement).order_by(StockMovement.id.desc())
    return list(db.scalars(stmt).all())
