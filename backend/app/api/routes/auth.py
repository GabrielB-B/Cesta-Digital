from datetime import datetime, timedelta, timezone
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
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
from app.services.auth_service import (
    authenticate_user,
    get_user_by_login_name,
    get_user_roles,
)

router = APIRouter(prefix="/auth", tags=["Autenticacao"])
logger = logging.getLogger(__name__)


def _normalize_login_name(login_name: str) -> str:
    return login_name.strip().lower()


def _build_retry_message(retry_after_seconds: int) -> str:
    retry_after_minutes = max(1, (retry_after_seconds + 59) // 60)
    return (
        "Muitas tentativas de login. "
        f"Tente novamente em aproximadamente {retry_after_minutes} minuto(s)."
    )


def _set_auth_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=access_token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite.lower(),
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite.lower(),
        path="/",
    )


@router.post("/login", response_model=LoginResponse)
def login(
    request: Request,
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    normalized_login_name = _normalize_login_name(form_data.username)
    client_ip = request.client.host if request.client is not None else None

    is_allowed, retry_after_seconds = is_login_allowed(
        db,
        normalized_login_name,
        client_ip,
    )
    if not is_allowed and retry_after_seconds is not None:
        record_audit_log(
            db,
            event_type="auth.login_blocked",
            details={
                "login_name": normalized_login_name,
                "reason": "rate_limited",
                "retry_after_seconds": retry_after_seconds,
            },
        )
        db.commit()
        log_backend_event(
            logger,
            "auth_login_blocked",
            level=logging.WARNING,
            login_name=normalized_login_name,
            retry_after_seconds=retry_after_seconds,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=_build_retry_message(retry_after_seconds),
            headers={"Retry-After": str(retry_after_seconds)},
        )

    user = authenticate_user(db, normalized_login_name, form_data.password)

    if user is None:
        retry_after_seconds = record_failed_login(db, normalized_login_name, client_ip)
        failed_user = get_user_by_login_name(db, normalized_login_name)
        record_audit_log(
            db,
            event_type="auth.login_failed",
            actor_email=failed_user.email if failed_user is not None else None,
            entity_type="user" if failed_user is not None else None,
            entity_id=failed_user.id if failed_user is not None else None,
            details={
                "login_name": normalized_login_name,
                "reason": "invalid_credentials",
            },
        )
        db.commit()
        log_backend_event(
            logger,
            "auth_login_failed",
            level=logging.WARNING,
            login_name=normalized_login_name,
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
            detail="Nome de login ou senha invalidos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        retry_after_seconds = record_failed_login(db, normalized_login_name, client_ip)
        record_audit_log(
            db,
            event_type="auth.login_failed",
            actor_user=user,
            actor_email=user.email,
            entity_type="user",
            entity_id=user.id,
            details={
                "login_name": user.login_name,
                "reason": "inactive_user",
            },
        )
        db.commit()
        log_backend_event(
            logger,
            "auth_login_failed",
            level=logging.WARNING,
            actor_user_id=user.id,
            actor_email=user.email,
            login_name=user.login_name,
            reason="inactive_user",
            retry_after_seconds=retry_after_seconds,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inativo.",
        )

    reset_login_rate_limit(db, normalized_login_name, client_ip)
    roles = get_user_roles(db, user.id)
    user.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
    record_audit_log(
        db,
        event_type="auth.login_succeeded",
        actor_user=user,
        entity_type="user",
        entity_id=user.id,
        details={"login_name": user.login_name, "roles": roles},
    )
    db.commit()
    db.refresh(user)
    log_backend_event(
        logger,
        "auth_login_succeeded",
        actor_user_id=user.id,
        actor_email=user.email,
        login_name=user.login_name,
        roles=roles,
    )

    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    _set_auth_cookie(response, access_token)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        name=user.name,
        login_name=user.login_name,
        email=user.email,
        roles=roles,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    _clear_auth_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return None


@router.get("/me", response_model=CurrentUserResponse)
def read_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    roles = get_user_roles(db, current_user.id)

    return CurrentUserResponse(
        id=current_user.id,
        name=current_user.name,
        login_name=current_user.login_name,
        email=current_user.email,
        is_active=current_user.is_active,
        roles=roles,
    )
