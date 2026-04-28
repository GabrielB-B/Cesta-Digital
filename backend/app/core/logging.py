import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.core.request_context import get_request_context


def configure_logging() -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    if not root_logger.handlers:
        root_logger.addHandler(logging.StreamHandler())

    formatter = logging.Formatter("%(message)s")
    for handler in root_logger.handlers:
        handler.setFormatter(formatter)


def _serialize_log_payload(payload: dict[str, Any]) -> str:
    return json.dumps(payload, default=str, ensure_ascii=True, sort_keys=True)


def log_backend_event(
    logger: logging.Logger,
    event: str,
    *,
    level: int = logging.INFO,
    **fields: Any,
) -> None:
    context = get_request_context()
    payload: dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "request_id": context.request_id,
        "method": context.method,
        "path": context.path,
        "client_ip": context.client_ip,
        "user_id": context.user_id,
        "user_email": context.user_email,
    }
    payload.update(fields)
    logger.log(level, _serialize_log_payload(payload))
