from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import CurrentUserResponse, LoginResponse
from app.services.auth_service import authenticate_user, get_user_roles

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=LoginResponse)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    user = authenticate_user(db, form_data.username, form_data.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário inativo.",
        )

    roles = get_user_roles(db, user.id)

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