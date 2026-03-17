from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.family import FamilyCreate, FamilyDetailResponse, FamilyResponse
from app.services.family_service import create_family, get_family_detail, list_families

router = APIRouter(prefix="/families", tags=["Famílias"])


@router.post("", response_model=FamilyResponse, status_code=201)
def create_family_endpoint(
    payload: FamilyCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Cria uma nova família."""
    return create_family(db, payload, current_user)


@router.get("", response_model=list[FamilyResponse])
def list_families_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista as famílias cadastradas."""
    return list_families(db)


@router.get("/{family_id}", response_model=FamilyDetailResponse)
def get_family_detail_endpoint(
    family_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Retorna o detalhe completo de uma família."""
    return get_family_detail(db, family_id)