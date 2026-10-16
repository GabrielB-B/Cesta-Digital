from urllib.parse import urlsplit

from fastapi import Request

from app.core.config import settings


UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _origin_from_referer(referer: str | None) -> str | None:
    if not referer:
        return None

    parsed = urlsplit(referer)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def has_trusted_request_origin(request: Request) -> bool:
    """Validate browser origin for state-changing requests authenticated by cookie."""
    if request.method.upper() not in UNSAFE_METHODS:
        return True

    if settings.auth_cookie_name not in request.cookies:
        return True

    request_origin = request.headers.get("origin")
    if request_origin is None:
        request_origin = _origin_from_referer(request.headers.get("referer"))

    trusted_origins = {origin.rstrip("/") for origin in settings.cors_origins}
    return request_origin is not None and request_origin.rstrip("/") in trusted_origins
