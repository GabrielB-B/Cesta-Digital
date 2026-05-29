from datetime import datetime, timedelta, timezone
import math

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.login_rate_limit import LoginRateLimit


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _normalize_ip(client_ip: str | None) -> str:
    return (client_ip or "unknown").strip().lower()


def _build_key(email: str, client_ip: str | None) -> str:
    return f"{_normalize_email(email)}::{_normalize_ip(client_ip)}"


def _seconds_until(target: datetime, now: datetime) -> int:
    return max(1, math.ceil((target - now).total_seconds()))


def _reset_bucket(bucket: LoginRateLimit) -> None:
    bucket.attempts = 0
    bucket.window_started_at = None
    bucket.locked_until = None


def _cleanup_bucket(bucket: LoginRateLimit, now: datetime) -> None:
    if bucket.locked_until is not None and bucket.locked_until <= now:
        _reset_bucket(bucket)
        return

    if bucket.window_started_at is None:
        return

    window_delta = now - bucket.window_started_at
    if window_delta.total_seconds() > settings.login_rate_limit_window_seconds:
        _reset_bucket(bucket)


def _get_bucket_for_update(
    db: Session,
    email: str,
    client_ip: str | None,
) -> LoginRateLimit | None:
    stmt = (
        select(LoginRateLimit)
        .where(LoginRateLimit.bucket_key == _build_key(email, client_ip))
        .with_for_update()
    )
    return db.scalar(stmt)


def is_login_allowed(
    db: Session,
    email: str,
    client_ip: str | None,
) -> tuple[bool, int | None]:
    now = _utcnow_naive()
    bucket = _get_bucket_for_update(db, email, client_ip)
    if bucket is None:
        return True, None

    _cleanup_bucket(bucket, now)
    db.flush()

    if bucket.locked_until is None:
        return True, None

    return False, _seconds_until(bucket.locked_until, now)


def record_failed_login(
    db: Session,
    email: str,
    client_ip: str | None,
) -> int | None:
    now = _utcnow_naive()
    bucket = _get_bucket_for_update(db, email, client_ip)

    if bucket is None:
        bucket = LoginRateLimit(
            bucket_key=_build_key(email, client_ip),
            email=_normalize_email(email),
            client_ip=_normalize_ip(client_ip),
            attempts=0,
        )
        db.add(bucket)
        db.flush()

    _cleanup_bucket(bucket, now)

    if bucket.window_started_at is None:
        bucket.window_started_at = now
        bucket.attempts = 1
        bucket.locked_until = None
        db.flush()
        return None

    bucket.attempts += 1
    if bucket.attempts < settings.login_rate_limit_attempts:
        db.flush()
        return None

    bucket.locked_until = now + timedelta(
        seconds=settings.login_rate_limit_lockout_seconds
    )
    db.flush()
    return _seconds_until(bucket.locked_until, now)


def reset_login_rate_limit(db: Session, email: str, client_ip: str | None) -> None:
    bucket = _get_bucket_for_update(db, email, client_ip)
    if bucket is not None:
        db.delete(bucket)
        db.flush()


def clear_login_rate_limits(db: Session | None = None) -> None:
    if db is None:
        return

    db.execute(delete(LoginRateLimit))
    db.flush()
