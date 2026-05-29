from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.stock_movement import StockMovementCreate, StockMovementResponse
from app.services.stock_movement_service import (
    create_stock_movement,
    list_stock_movements,
)

router = APIRouter(
    tags=["Movimentações de Estoque"],
    dependencies=[Depends(require_any_role("admin", "operador"))],
)


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
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    item_id: int | None = Query(default=None, ge=1),
    batch_id: int | None = Query(default=None, ge=1),
    limit: int | None = Query(default=None, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Lista as movimentações de estoque registradas."""
    movements, total = list_stock_movements(
        db,
        item_id=item_id,
        batch_id=batch_id,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    return movements
