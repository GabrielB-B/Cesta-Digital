from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.user_admin import (
    RoleOptionResponse,
    UserAdminResponse,
    UserCreate,
    UserPasswordReset,
    UserUpdate,
)
from app.services.user_admin_service import (
    create_user,
    list_available_roles,
    list_users,
    reset_user_password,
    update_user,
)

router = APIRouter(
    tags=["Administracao de Usuarios"],
    dependencies=[Depends(require_any_role("admin"))],
)


@router.get("/users", response_model=list[UserAdminResponse])
def list_users_endpoint(
    db: Annotated[Session, Depends(get_db)],
):
    return list_users(db)


@router.get("/users/roles", response_model=list[RoleOptionResponse])
def list_roles_endpoint(
    db: Annotated[Session, Depends(get_db)],
):
    return list_available_roles(db)


@router.post("/users", response_model=UserAdminResponse, status_code=201)
def create_user_endpoint(
    payload: UserCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return create_user(db, payload, current_user)


@router.put("/users/{user_id}", response_model=UserAdminResponse)
def update_user_endpoint(
    user_id: int,
    payload: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return update_user(db, user_id, payload, current_user)


@router.put("/users/{user_id}/password", response_model=UserAdminResponse)
def reset_user_password_endpoint(
    user_id: int,
    payload: UserPasswordReset,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return reset_user_password(db, user_id, payload, current_user)
