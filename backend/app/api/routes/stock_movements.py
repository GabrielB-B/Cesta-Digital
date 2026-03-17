from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.stock_movement import StockMovementCreate, StockMovementResponse
from app.services.stock_movement_service import (
    create_stock_movement,
    list_stock_movements,
)

router = APIRouter(tags=["Movimentações de Estoque"])


@router.post("/stock-movements", response_model=StockMovementResponse, status_code=201)
def create_stock_movement_endpoint(
    payload: StockMovementCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Registra uma movimentação de estoque sobre um lote existente."""
    return create_stock_movement(db, payload, current_user)


@router.get("/stock-movements", response_model=list[StockMovementResponse])
def list_stock_movements_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista as movimentações de estoque registradas."""
    return list_stock_movements(db)