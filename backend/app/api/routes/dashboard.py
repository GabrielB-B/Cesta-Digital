from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardOverviewResponse
from app.services.dashboard_service import get_dashboard_overview

router = APIRouter(
    tags=["Dashboard"],
    dependencies=[Depends(require_any_role("admin", "lider_social", "operador"))],
)


@router.get("/dashboard/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Retorna os indicadores principais do dashboard inicial."""
    return get_dashboard_overview(db)
