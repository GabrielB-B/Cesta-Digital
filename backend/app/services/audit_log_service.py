from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.request_context import get_request_context
from app.models.audit_log import AuditLog
from app.models.user import User


def record_audit_log(
    db: Session,
    *,
    event_type: str,
    actor_user: User | None = None,
    actor_email: str | None = None,
    entity_type: str | None = None,
    entity_id: int | str | None = None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    request_context = get_request_context()
    audit_log = AuditLog(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        actor_user_id=getattr(actor_user, "id", None),
        actor_email=actor_email
        or getattr(actor_user, "email", None)
        or request_context.user_email,
        request_id=request_context.request_id,
        ip_address=request_context.client_ip,
        details=details,
    )
    db.add(audit_log)
    db.flush()
    return audit_log


def list_audit_logs(
    db: Session,
    *,
    event_type: str | None = None,
    actor_email: str | None = None,
    entity_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, object]:
    filters = []

    if event_type:
        filters.append(AuditLog.event_type == event_type.strip())

    if actor_email:
        filters.append(AuditLog.actor_email == actor_email.strip().lower())

    if entity_type:
        filters.append(AuditLog.entity_type == entity_type.strip())

    total_stmt = select(func.count(AuditLog.id))
    items_stmt = select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc())

    if filters:
        total_stmt = total_stmt.where(*filters)
        items_stmt = items_stmt.where(*filters)

    total = db.scalar(total_stmt) or 0
    items = list(db.scalars(items_stmt.offset(offset).limit(limit)).all())

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": items,
    }
