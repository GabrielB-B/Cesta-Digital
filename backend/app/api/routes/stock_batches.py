from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.stock_batch import StockBatchCreate, StockBatchResponse
from app.services.stock_batch_service import create_stock_batch, list_stock_batches

router = APIRouter(
    tags=["Lotes de Estoque"],
    dependencies=[Depends(require_any_role("admin", "operador"))],
)


@router.post("/stock-batches", response_model=StockBatchResponse, status_code=201)
def create_stock_batch_endpoint(
    payload: StockBatchCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Registra uma entrada de lote no estoque."""
    return create_stock_batch(db, payload, current_user)


@router.get("/stock-batches", response_model=list[StockBatchResponse])
def list_stock_batches_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista os lotes cadastrados no estoque."""
    return list_stock_batches(db)
