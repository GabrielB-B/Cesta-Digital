from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str
    entity_type: str | None
    entity_id: str | None
    actor_user_id: int | None
    actor_email: str | None
    request_id: str | None
    ip_address: str | None
    details: dict[str, Any] | None
    created_at: datetime


class AuditLogListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[AuditLogResponse]
