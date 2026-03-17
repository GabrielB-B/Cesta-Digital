from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.social_assessment import (
    SocialAssessmentCreate,
    SocialAssessmentResponse,
    SocialAssessmentUpdate,
)
from app.services.social_assessment_service import (
    create_social_assessment,
    get_social_assessment,
    list_social_assessments_by_family,
    update_social_assessment,
)

router = APIRouter(tags=["Avaliações Sociais"])


@router.post(
    "/families/{family_id}/assessments",
    response_model=SocialAssessmentResponse,
    status_code=201,
)
def create_social_assessment_endpoint(
    family_id: int,
    payload: SocialAssessmentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Cria uma nova avaliação social para a família."""
    return create_social_assessment(db, family_id, payload, current_user)


@router.get(
    "/families/{family_id}/assessments",
    response_model=list[SocialAssessmentResponse],
)
def list_social_assessments_by_family_endpoint(
    family_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista o histórico de avaliações sociais de uma família."""
    return list_social_assessments_by_family(db, family_id)


@router.get(
    "/assessments/{assessment_id}",
    response_model=SocialAssessmentResponse,
)
def get_social_assessment_endpoint(
    assessment_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Busca uma avaliação social específica."""
    return get_social_assessment(db, assessment_id)


@router.put(
    "/assessments/{assessment_id}",
    response_model=SocialAssessmentResponse,
)
def update_social_assessment_endpoint(
    assessment_id: int,
    payload: SocialAssessmentUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Atualiza uma avaliação social existente."""
    return update_social_assessment(db, assessment_id, payload, current_user)