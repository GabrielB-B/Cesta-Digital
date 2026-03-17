from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.benefit import BenefitCreate, BenefitResponse, BenefitUpdate
from app.services.benefit_service import (
    create_benefit,
    delete_benefit,
    list_benefits_by_family,
    update_benefit,
)

router = APIRouter(tags=["Benefícios"])


@router.post("/families/{family_id}/benefits", response_model=BenefitResponse, status_code=201)
def create_benefit_endpoint(
    family_id: int,
    payload: BenefitCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Cria um benefício vinculado à família."""
    return create_benefit(db, family_id, payload)


@router.get("/families/{family_id}/benefits", response_model=list[BenefitResponse])
def list_benefits_by_family_endpoint(
    family_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista os benefícios cadastrados para uma família."""
    return list_benefits_by_family(db, family_id)


@router.put("/benefits/{benefit_id}", response_model=BenefitResponse)
def update_benefit_endpoint(
    benefit_id: int,
    payload: BenefitUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Atualiza um benefício existente."""
    return update_benefit(db, benefit_id, payload)


@router.delete("/benefits/{benefit_id}", status_code=204)
def delete_benefit_endpoint(
    benefit_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Exclui um benefício existente."""
    delete_benefit(db, benefit_id)
    return Response(status_code=204)