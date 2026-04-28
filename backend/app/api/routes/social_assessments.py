from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.social_assessment import (
    EligibilityPreviewResponse,
    SocialAssessmentCreate,
    SocialAssessmentResponse,
)
from app.services.eligibility_service import get_eligibility_preview
from app.services.social_assessment_service import (
    create_social_assessment,
    list_social_assessments_by_family,
)

router = APIRouter(
    tags=["Avaliações Sociais"],
    dependencies=[Depends(require_any_role("admin", "lider_social"))],
)


@router.get(
    "/families/{family_id}/eligibility-preview",
    response_model=EligibilityPreviewResponse,
)
def get_eligibility_preview_endpoint(
    family_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Retorna a sugestão automática do sistema para a família."""
    return get_eligibility_preview(db, family_id)


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
    """Cria uma nova avaliação social."""
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
    """Lista as avaliações sociais da família."""
    return list_social_assessments_by_family(db, family_id)
