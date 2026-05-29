from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole


def get_user_by_login_name(db: Session, login_name: str) -> User | None:
    return db.scalar(select(User).where(User.login_name == login_name))


def get_user_roles(db: Session, user_id: int) -> list[str]:
    stmt = (
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    )
    return list(db.scalars(stmt).all())


def authenticate_user(db: Session, login_name: str, password: str) -> User | None:
    user = get_user_by_login_name(db, login_name)
    if user is None:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user
