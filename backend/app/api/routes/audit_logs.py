from typing import Annotated
import csv
import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit_log import AuditLogListResponse
from app.services.audit_log_service import export_audit_logs, list_audit_logs

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
    created_from: datetime | None = Query(default=None),
    created_to: datetime | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    return list_audit_logs(
        db,
        event_type=event_type,
        actor_email=actor_email,
        entity_type=entity_type,
        created_from=created_from,
        created_to=created_to,
        limit=limit,
        offset=offset,
    )


@router.get("/audit-logs/export")
def export_audit_logs_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    event_type: str | None = Query(default=None),
    actor_email: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    created_from: datetime | None = Query(default=None),
    created_to: datetime | None = Query(default=None),
    limit: int = Query(default=5000, ge=1, le=10000),
):
    rows = export_audit_logs(
        db,
        event_type=event_type,
        actor_email=actor_email,
        entity_type=entity_type,
        created_from=created_from,
        created_to=created_to,
        limit=limit,
    )
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "created_at",
            "event_type",
            "actor_email",
            "entity_type",
            "entity_id",
            "request_id",
            "ip_address",
            "details",
        ]
    )

    for row in rows:
        writer.writerow(
            [
                row.id,
                row.created_at.isoformat(),
                row.event_type,
                row.actor_email or "",
                row.entity_type or "",
                row.entity_id or "",
                row.request_id or "",
                row.ip_address or "",
                json.dumps(row.details or {}, ensure_ascii=False),
            ]
        )

    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="audit-logs.csv"',
        },
    )
