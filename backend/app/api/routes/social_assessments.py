from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.social_assessment import (
    AssessmentQueueResponse,
    AssessmentQueueStatus,
    EligibilityPreviewResponse,
    SocialAssessmentCreate,
    SocialAssessmentResponse,
)
from app.services.assessment_queue_service import list_assessment_queue
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
    "/social-assessments/queue",
    response_model=AssessmentQueueResponse,
)
def list_assessment_queue_endpoint(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    q: str | None = Query(default=None, max_length=150),
    status: AssessmentQueueStatus | None = Query(default=None),
    due_soon_days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=25, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Lista a fila paginada de avaliacao e reavaliacao de familias."""
    result = list_assessment_queue(
        db,
        q=q,
        status=status,
        due_soon_days=due_soon_days,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(result["total"])
    return result


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
