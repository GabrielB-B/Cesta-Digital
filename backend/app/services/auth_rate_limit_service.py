from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import math
from threading import Lock

from app.core.config import settings


@dataclass
class _LoginBucket:
    attempts: int = 0
    window_started_at: datetime | None = None
    locked_until: datetime | None = None


_login_buckets: dict[str, _LoginBucket] = {}
_login_rate_limit_lock = Lock()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _build_key(email: str, client_ip: str | None) -> str:
    normalized_ip = (client_ip or "unknown").strip().lower()
    return f"{_normalize_email(email)}::{normalized_ip}"


def _reset_bucket(bucket: _LoginBucket) -> None:
    bucket.attempts = 0
    bucket.window_started_at = None
    bucket.locked_until = None


def _cleanup_bucket(bucket: _LoginBucket, now: datetime) -> None:
    if bucket.locked_until is not None and bucket.locked_until <= now:
        _reset_bucket(bucket)
        return

    if bucket.window_started_at is None:
        return

    window_delta = now - bucket.window_started_at
    if window_delta.total_seconds() > settings.login_rate_limit_window_seconds:
        _reset_bucket(bucket)


def _seconds_until(target: datetime, now: datetime) -> int:
    return max(1, math.ceil((target - now).total_seconds()))


def is_login_allowed(email: str, client_ip: str | None) -> tuple[bool, int | None]:
    now = _utcnow()
    key = _build_key(email, client_ip)

    with _login_rate_limit_lock:
        bucket = _login_buckets.get(key)
        if bucket is None:
            return True, None

        _cleanup_bucket(bucket, now)
        if bucket.locked_until is None:
            return True, None

        return False, _seconds_until(bucket.locked_until, now)


def record_failed_login(email: str, client_ip: str | None) -> int | None:
    now = _utcnow()
    key = _build_key(email, client_ip)

    with _login_rate_limit_lock:
        bucket = _login_buckets.setdefault(key, _LoginBucket())
        _cleanup_bucket(bucket, now)

        if bucket.window_started_at is None:
            bucket.window_started_at = now
            bucket.attempts = 1
            return None

        bucket.attempts += 1
        if bucket.attempts < settings.login_rate_limit_attempts:
            return None

        bucket.locked_until = now + timedelta(
            seconds=settings.login_rate_limit_lockout_seconds
        )
        return _seconds_until(bucket.locked_until, now)


def reset_login_rate_limit(email: str, client_ip: str | None) -> None:
    key = _build_key(email, client_ip)
    with _login_rate_limit_lock:
        _login_buckets.pop(key, None)


def clear_login_rate_limits() -> None:
    with _login_rate_limit_lock:
        _login_buckets.clear()
