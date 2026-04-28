from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit_log import AuditLogListResponse
from app.services.audit_log_service import list_audit_logs

router = APIRouter(
    tags=["Auditoria"],
    dependencies=[Depends(require_any_role("admin"))],
)


@router.get("/audit-logs", response_model=AuditLogListResponse)
def list_audit_logs_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    event_type: str | None = Query(default=None),
    actor_email: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    return list_audit_logs(
        db,
        event_type=event_type,
        actor_email=actor_email,
        entity_type=entity_type,
        limit=limit,
        offset=offset,
    )
