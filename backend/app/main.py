import logging
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, log_backend_event
from app.core.request_context import RequestContext, reset_request_context, set_request_context
from app.db.session import test_db_connection

configure_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


def _apply_security_headers(response) -> None:
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Request-ID"] = response.headers.get("X-Request-ID", "")
    if settings.app_env in {"staging", "production"}:
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    client_ip = request.client.host if request.client is not None else None
    context = RequestContext(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        client_ip=client_ip,
    )
    token = set_request_context(context)
    started_at = perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        log_backend_event(
            logger,
            "http_request_failed",
            level=logging.ERROR,
            status_code=500,
            duration_ms=duration_ms,
        )
        reset_request_context(token)
        raise

    response.headers["X-Request-ID"] = request_id
    _apply_security_headers(response)

    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    log_backend_event(
        logger,
        "http_request_completed",
        status_code=response.status_code,
        duration_ms=duration_ms,
    )
    reset_request_context(token)
    return response


@app.get("/")
def read_root():
    return {"message": "Cesta Digital API online"}


@app.get("/health/db")
def health_db():
    try:
        test_db_connection()
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Banco de dados indisponivel.",
        ) from exc
    return {"database": "ok"}
