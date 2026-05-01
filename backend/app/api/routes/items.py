from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.item import ItemCreate, ItemDetailResponse, ItemResponse, ItemUpdate
from app.services.item_service import (
    create_item,
    get_item_detail,
    list_items,
    update_item,
)

router = APIRouter(
    tags=["Itens"],
    dependencies=[Depends(require_any_role("admin", "operador"))],
)


@router.post("/items", response_model=ItemResponse, status_code=201)
def create_item_endpoint(
    payload: ItemCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Cria um novo item de estoque."""
    return create_item(db, payload)


@router.get("/items", response_model=list[ItemResponse])
def list_items_endpoint(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    q: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Lista os itens cadastrados."""
    items, total = list_items(
        db,
        q=q,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    return items


@router.get("/items/{item_id}", response_model=ItemDetailResponse)
def get_item_detail_endpoint(
    item_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Retorna o detalhe de um item."""
    return get_item_detail(db, item_id)


@router.put("/items/{item_id}", response_model=ItemDetailResponse)
def update_item_endpoint(
    item_id: int,
    payload: ItemUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Atualiza um item e permite sua inativacao."""
    return update_item(db, item_id, payload, current_user)
