from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.user_admin import UserCreate, UserPasswordReset, UserUpdate
from app.services.audit_log_service import record_audit_log
from app.services.auth_service import get_user_roles


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _normalize_login_name(login_name: str) -> str:
    return login_name.strip().lower()


def _resolve_roles(db: Session, role_names: list[str]) -> list[Role]:
    stmt = select(Role).where(Role.name.in_(role_names)).order_by(Role.name.asc())
    roles = list(db.scalars(stmt).all())

    if len(roles) != len(set(role_names)):
        raise HTTPException(
            status_code=422,
            detail="Um ou mais perfis informados sao invalidos.",
        )

    return roles


def _user_has_role(db: Session, user_id: int, role_name: str) -> bool:
    stmt = (
        select(func.count(UserRole.id))
        .join(Role, Role.id == UserRole.role_id)
        .where(
            UserRole.user_id == user_id,
            Role.name == role_name,
        )
    )
    return bool(db.scalar(stmt))


def _count_other_active_admins(db: Session, user_id: int) -> int:
    stmt = (
        select(func.count(User.id))
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .where(
            User.id != user_id,
            User.is_active.is_(True),
            Role.name == "admin",
        )
    )
    return int(db.scalar(stmt) or 0)


def _validate_admin_update_safety(
    db: Session,
    user: User,
    payload: UserUpdate,
    current_user: User,
) -> None:
    next_roles = set(payload.roles)

    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(
            status_code=400,
            detail="Voce nao pode desativar seu proprio usuario.",
        )

    if user.id == current_user.id and "admin" not in next_roles:
        raise HTTPException(
            status_code=400,
            detail="Voce nao pode remover seu proprio perfil administrador.",
        )

    removes_active_admin = (
        _user_has_role(db, user.id, "admin")
        and (not payload.is_active or "admin" not in next_roles)
    )
    if removes_active_admin and _count_other_active_admins(db, user.id) == 0:
        raise HTTPException(
            status_code=400,
            detail="Mantenha pelo menos um administrador ativo no sistema.",
        )


def _serialize_user(db: Session, user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "login_name": user.login_name,
        "email": user.email,
        "is_active": user.is_active,
        "roles": get_user_roles(db, user.id),
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def _sync_user_roles(db: Session, user: User, role_names: list[str]) -> None:
    roles = _resolve_roles(db, role_names)
    existing_user_roles = list(
        db.scalars(select(UserRole).where(UserRole.user_id == user.id)).all()
    )

    for user_role in existing_user_roles:
        db.delete(user_role)

    db.flush()

    for role in roles:
        db.add(UserRole(user_id=user.id, role_id=role.id))


def list_available_roles(db: Session) -> list[Role]:
    stmt = select(Role).order_by(Role.name.asc())
    return list(db.scalars(stmt).all())


def list_users(db: Session) -> list[dict]:
    stmt = select(User).order_by(User.name.asc(), User.login_name.asc())
    users = list(db.scalars(stmt).all())
    return [_serialize_user(db, user) for user in users]


def create_user(db: Session, payload: UserCreate, current_user: User) -> dict:
    normalized_login_name = _normalize_login_name(payload.login_name)
    normalized_email = _normalize_email(str(payload.email))

    existing_login = db.scalar(
        select(User).where(User.login_name == normalized_login_name)
    )
    if existing_login is not None:
        raise HTTPException(
            status_code=409,
            detail="Ja existe um usuario com este nome de login.",
        )

    existing_user = db.scalar(select(User).where(User.email == normalized_email))
    if existing_user is not None:
        raise HTTPException(
            status_code=409,
            detail="Ja existe um usuario com este email.",
        )

    user = User(
        name=payload.name.strip(),
        login_name=normalized_login_name,
        email=normalized_email,
        password_hash=get_password_hash(payload.password.strip()),
        is_active=payload.is_active,
    )

    db.add(user)
    db.flush()
    _sync_user_roles(db, user, payload.roles)
    record_audit_log(
        db,
        event_type="user.created",
        actor_user=current_user,
        entity_type="user",
        entity_id=user.id,
        details={
            "login_name": user.login_name,
            "email": user.email,
            "is_active": user.is_active,
            "roles": payload.roles,
        },
    )
    db.commit()
    db.refresh(user)

    return _serialize_user(db, user)


def update_user(db: Session, user_id: int, payload: UserUpdate, current_user: User) -> dict:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado.")

    normalized_login_name = _normalize_login_name(payload.login_name)
    normalized_email = _normalize_email(str(payload.email))
    existing_login = db.scalar(
        select(User).where(
            User.login_name == normalized_login_name,
            User.id != user_id,
        )
    )
    if existing_login is not None:
        raise HTTPException(
            status_code=409,
            detail="Ja existe outro usuario com este nome de login.",
        )

    existing_user = db.scalar(
        select(User).where(
            User.email == normalized_email,
            User.id != user_id,
        )
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=409,
            detail="Ja existe outro usuario com este email.",
        )

    _validate_admin_update_safety(db, user, payload, current_user)

    user.name = payload.name.strip()
    user.login_name = normalized_login_name
    user.email = normalized_email
    user.is_active = payload.is_active

    _sync_user_roles(db, user, payload.roles)
    record_audit_log(
        db,
        event_type="user.updated",
        actor_user=current_user,
        entity_type="user",
        entity_id=user.id,
        details={
            "login_name": user.login_name,
            "email": user.email,
            "is_active": user.is_active,
            "roles": payload.roles,
        },
    )
    db.commit()
    db.refresh(user)

    return _serialize_user(db, user)


def reset_user_password(
    db: Session,
    user_id: int,
    payload: UserPasswordReset,
    current_user: User,
) -> dict:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado.")

    user.password_hash = get_password_hash(payload.new_password.strip())
    record_audit_log(
        db,
        event_type="user.password_reset",
        actor_user=current_user,
        entity_type="user",
        entity_id=user.id,
        details={"login_name": user.login_name, "email": user.email},
    )
    db.commit()
    db.refresh(user)

    return _serialize_user(db, user)
