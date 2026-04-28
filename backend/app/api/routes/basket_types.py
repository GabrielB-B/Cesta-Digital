from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.basket_type import (
    BasketTypeCreate,
    BasketTypeDetailResponse,
    BasketTypeItemCreate,
    BasketTypeItemResponse,
    BasketTypeResponse,
)
from app.services.basket_type_service import (
    add_item_to_basket_type,
    create_basket_type,
    get_basket_type_detail,
    list_basket_type_items,
    list_basket_types,
)

router = APIRouter(
    tags=["Tipos de Cesta"],
    dependencies=[Depends(require_any_role("admin", "operador"))],
)


@router.post("/basket-types", response_model=BasketTypeResponse, status_code=201)
def create_basket_type_endpoint(
    payload: BasketTypeCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Cria um novo tipo de cesta."""
    return create_basket_type(db, payload)


@router.get("/basket-types", response_model=list[BasketTypeResponse])
def list_basket_types_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista os tipos de cesta cadastrados."""
    return list_basket_types(db)


@router.get("/basket-types/{basket_type_id}", response_model=BasketTypeDetailResponse)
def get_basket_type_detail_endpoint(
    basket_type_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Retorna o detalhe de um tipo de cesta."""
    return get_basket_type_detail(db, basket_type_id)


@router.post(
    "/basket-types/{basket_type_id}/items",
    response_model=BasketTypeItemResponse,
    status_code=201,
)
def add_item_to_basket_type_endpoint(
    basket_type_id: int,
    payload: BasketTypeItemCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Adiciona item à receita de um tipo de cesta."""
    return add_item_to_basket_type(db, basket_type_id, payload)


@router.get(
    "/basket-types/{basket_type_id}/items",
    response_model=list[BasketTypeItemResponse],
)
def list_basket_type_items_endpoint(
    basket_type_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista a receita de um tipo de cesta."""
    return list_basket_type_items(db, basket_type_id)
