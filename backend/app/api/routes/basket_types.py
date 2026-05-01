from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.basket_type import (
    BasketTypeCreate,
    BasketTypeDetailResponse,
    BasketTypeItemCreate,
    BasketTypeItemResponse,
    BasketTypeItemUpdate,
    BasketTypeResponse,
    BasketTypeUpdate,
)
from app.services.basket_type_service import (
    add_item_to_basket_type,
    create_basket_type,
    delete_basket_type_item,
    get_basket_type_detail,
    list_basket_type_items,
    list_basket_types,
    update_basket_type,
    update_basket_type_item,
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
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    q: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Lista os tipos de cesta cadastrados."""
    basket_types, total = list_basket_types(
        db,
        q=q,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    return basket_types


@router.get("/basket-types/{basket_type_id}", response_model=BasketTypeDetailResponse)
def get_basket_type_detail_endpoint(
    basket_type_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Retorna o detalhe de um tipo de cesta."""
    return get_basket_type_detail(db, basket_type_id)


@router.put("/basket-types/{basket_type_id}", response_model=BasketTypeDetailResponse)
def update_basket_type_endpoint(
    basket_type_id: int,
    payload: BasketTypeUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Atualiza um tipo de cesta e permite sua inativacao."""
    return update_basket_type(db, basket_type_id, payload, current_user)


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
    """Adiciona item a receita de um tipo de cesta."""
    return add_item_to_basket_type(db, basket_type_id, payload)


@router.put(
    "/basket-types/{basket_type_id}/items/{item_id}",
    response_model=BasketTypeItemResponse,
)
def update_basket_type_item_endpoint(
    basket_type_id: int,
    item_id: int,
    payload: BasketTypeItemUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Atualiza a quantidade exigida de um item da receita."""
    return update_basket_type_item(db, basket_type_id, item_id, payload, current_user)


@router.delete("/basket-types/{basket_type_id}/items/{item_id}", status_code=204)
def delete_basket_type_item_endpoint(
    basket_type_id: int,
    item_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Remove um item da receita do tipo de cesta."""
    delete_basket_type_item(db, basket_type_id, item_id, current_user)


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
