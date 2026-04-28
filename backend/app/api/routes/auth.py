from datetime import datetime, timedelta, timezone
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.core.logging import log_backend_event
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import CurrentUserResponse, LoginResponse
from app.services.audit_log_service import record_audit_log
from app.services.auth_rate_limit_service import (
    is_login_allowed,
    record_failed_login,
    reset_login_rate_limit,
)
from app.services.auth_service import authenticate_user, get_user_roles

router = APIRouter(prefix="/auth", tags=["Autenticacao"])
logger = logging.getLogger(__name__)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _build_retry_message(retry_after_seconds: int) -> str:
    retry_after_minutes = max(1, (retry_after_seconds + 59) // 60)
    return (
        "Muitas tentativas de login. "
        f"Tente novamente em aproximadamente {retry_after_minutes} minuto(s)."
    )


@router.post("/login", response_model=LoginResponse)
def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    normalized_email = _normalize_email(form_data.username)
    client_ip = request.client.host if request.client is not None else None

    is_allowed, retry_after_seconds = is_login_allowed(normalized_email, client_ip)
    if not is_allowed and retry_after_seconds is not None:
        record_audit_log(
            db,
            event_type="auth.login_blocked",
            actor_email=normalized_email,
            details={
                "reason": "rate_limited",
                "retry_after_seconds": retry_after_seconds,
            },
        )
        db.commit()
        log_backend_event(
            logger,
            "auth_login_blocked",
            level=logging.WARNING,
            actor_email=normalized_email,
            retry_after_seconds=retry_after_seconds,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=_build_retry_message(retry_after_seconds),
            headers={"Retry-After": str(retry_after_seconds)},
        )

    user = authenticate_user(db, form_data.username, form_data.password)

    if user is None:
        retry_after_seconds = record_failed_login(normalized_email, client_ip)
        record_audit_log(
            db,
            event_type="auth.login_failed",
            actor_email=normalized_email,
            details={"reason": "invalid_credentials"},
        )
        db.commit()
        log_backend_event(
            logger,
            "auth_login_failed",
            level=logging.WARNING,
            actor_email=normalized_email,
            reason="invalid_credentials",
            retry_after_seconds=retry_after_seconds,
        )

        if retry_after_seconds is not None:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=_build_retry_message(retry_after_seconds),
                headers={"Retry-After": str(retry_after_seconds)},
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha invalidos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        retry_after_seconds = record_failed_login(normalized_email, client_ip)
        record_audit_log(
            db,
            event_type="auth.login_failed",
            actor_user=user,
            actor_email=user.email,
            entity_type="user",
            entity_id=user.id,
            details={"reason": "inactive_user"},
        )
        db.commit()
        log_backend_event(
            logger,
            "auth_login_failed",
            level=logging.WARNING,
            actor_user_id=user.id,
            actor_email=user.email,
            reason="inactive_user",
            retry_after_seconds=retry_after_seconds,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inativo.",
        )

    reset_login_rate_limit(normalized_email, client_ip)
    roles = get_user_roles(db, user.id)
    user.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
    record_audit_log(
        db,
        event_type="auth.login_succeeded",
        actor_user=user,
        entity_type="user",
        entity_id=user.id,
        details={"roles": roles},
    )
    db.commit()
    db.refresh(user)
    log_backend_event(
        logger,
        "auth_login_succeeded",
        actor_user_id=user.id,
        actor_email=user.email,
        roles=roles,
    )

    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        name=user.name,
        email=user.email,
        roles=roles,
    )


@router.get("/me", response_model=CurrentUserResponse)
def read_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    roles = get_user_roles(db, current_user.id)

    return CurrentUserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        is_active=current_user.is_active,
        roles=roles,
    )
