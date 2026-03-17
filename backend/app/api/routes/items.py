from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.item import ItemCreate, ItemDetailResponse, ItemResponse
from app.services.item_service import create_item, get_item_detail, list_items

router = APIRouter(tags=["Itens"])


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
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista os itens cadastrados."""
    return list_items(db)


@router.get("/items/{item_id}", response_model=ItemDetailResponse)
def get_item_detail_endpoint(
    item_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Retorna o detalhe de um item."""
    return get_item_detail(db, item_id)