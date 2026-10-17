from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.item_category import (
    ItemCategoryCreate,
    ItemCategoryResponse,
    ItemCategoryUpdate,
)
from app.services.item_category_service import (
    create_item_category,
    list_item_categories,
    update_item_category,
)

router = APIRouter(tags=["Categorias de Itens"])


@router.post(
    "/item-categories",
    response_model=ItemCategoryResponse,
    status_code=201,
    dependencies=[Depends(require_any_role("admin", "operador"))],
)
def create_item_category_endpoint(
    payload: ItemCategoryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Cria uma nova categoria de item."""
    return create_item_category(db, payload, current_user)


@router.get(
    "/item-categories",
    response_model=list[ItemCategoryResponse],
    dependencies=[Depends(require_any_role("admin", "operador", "colaborador"))],
)
def list_item_categories_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    q: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
):
    """Lista as categorias de item cadastradas."""
    return list_item_categories(db, q=q, is_active=is_active)


@router.put(
    "/item-categories/{category_id}",
    response_model=ItemCategoryResponse,
    dependencies=[Depends(require_any_role("admin", "operador"))],
)
def update_item_category_endpoint(
    category_id: int,
    payload: ItemCategoryUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Atualiza uma categoria e permite sua inativacao."""
    return update_item_category(db, category_id, payload, current_user)
