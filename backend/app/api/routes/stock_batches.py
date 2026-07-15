from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.stock_batch import (
    StockBatchCreate,
    StockBatchMetadataUpdate,
    StockBatchResponse,
)
from app.services.stock_batch_service import (
    create_stock_batch,
    list_stock_batches,
    update_stock_batch_metadata,
)

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


@router.patch(
    "/stock-batches/{batch_id}/metadata",
    response_model=StockBatchResponse,
)
def update_stock_batch_metadata_endpoint(
    batch_id: int,
    payload: StockBatchMetadataUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Corrige identificacao e estado fisico do lote com trilha de auditoria."""
    return update_stock_batch_metadata(db, batch_id, payload, current_user)


@router.get("/stock-batches", response_model=list[StockBatchResponse])
def list_stock_batches_endpoint(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    item_id: int | None = Query(default=None, ge=1),
    limit: int | None = Query(default=None, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Lista os lotes cadastrados no estoque."""
    batches, total = list_stock_batches(
        db,
        item_id=item_id,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    return batches
