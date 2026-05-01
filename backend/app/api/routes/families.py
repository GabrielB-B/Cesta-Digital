from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.family import (
    FamilyCreate,
    FamilyDetailResponse,
    FamilyResponse,
    FamilyStatusUpdate,
)
from app.services.family_service import (
    create_family,
    get_family_detail,
    list_families,
    update_family_status,
)

router = APIRouter(
    prefix="/families",
    tags=["Familias"],
    dependencies=[Depends(require_any_role("admin", "lider_social"))],
)


@router.post("", response_model=FamilyResponse, status_code=201)
def create_family_endpoint(
    payload: FamilyCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Cria uma nova familia."""
    return create_family(db, payload, current_user)


@router.get("", response_model=list[FamilyResponse])
def list_families_endpoint(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Lista as familias cadastradas."""
    families, total = list_families(
        db,
        q=q,
        status=status,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    return families


@router.get("/{family_id}", response_model=FamilyDetailResponse)
def get_family_detail_endpoint(
    family_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Retorna o detalhe completo de uma familia."""
    return get_family_detail(db, family_id)


@router.patch("/{family_id}/status", response_model=FamilyDetailResponse)
def update_family_status_endpoint(
    family_id: int,
    payload: FamilyStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Atualiza o status operacional/social de uma familia."""
    return update_family_status(db, family_id, payload, current_user)
