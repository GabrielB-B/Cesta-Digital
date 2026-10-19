from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.operational import (
    OperationalBasketTypeResponse,
    OperationalFamilyResponse,
)
from app.services.operational_directory_service import (
    list_operational_basket_types,
    list_operational_families,
)

router = APIRouter(
    prefix="/operational",
    tags=["Consultas Operacionais"],
    dependencies=[Depends(require_any_role("admin", "lider_social", "operador", "colaborador"))],
)


@router.get("/families", response_model=list[OperationalFamilyResponse])
def list_operational_families_endpoint(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    q: str | None = Query(default=None),
    eligible_only: bool = Query(default=False),
    limit: int = Query(default=200, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    families, total = list_operational_families(
        db,
        q=q,
        eligible_only=eligible_only,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    return families


@router.get(
    "/basket-types",
    response_model=list[OperationalBasketTypeResponse],
    dependencies=[Depends(require_any_role("admin", "operador", "colaborador"))],
)
def list_operational_basket_types_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return list_operational_basket_types(db)
