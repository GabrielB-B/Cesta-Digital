from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.basket_availability import BasketAvailabilityResponse
from app.services.basket_availability_service import get_basket_availability

router = APIRouter(
    tags=["Disponibilidade de Cestas"],
    dependencies=[Depends(require_any_role("admin", "operador"))],
)


@router.get(
    "/basket-types/{basket_type_id}/availability",
    response_model=BasketAvailabilityResponse,
)
def get_basket_availability_endpoint(
    basket_type_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Calcula quantas cestas podem ser formadas com o estoque atual."""
    return get_basket_availability(db, basket_type_id)
