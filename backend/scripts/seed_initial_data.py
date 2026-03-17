from sqlalchemy import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole


ROLE_NAMES = ["admin", "lider_social", "operador"]


def seed_roles(db):
    existing_roles = db.scalars(select(Role)).all()
    existing_role_names = {role.name for role in existing_roles}

    for role_name in ROLE_NAMES:
        if role_name not in existing_role_names:
            db.add(Role(name=role_name, description=f"Perfil {role_name}"))

    db.commit()


def seed_first_admin(db):
    existing_admin = db.scalar(
        select(User).where(User.email == settings.first_admin_email)
    )

    if existing_admin:
        print(f"Usuário admin já existe: {existing_admin.email}")
        return

    admin_user = User(
        name=settings.first_admin_name,
        email=settings.first_admin_email,
        password_hash=get_password_hash(settings.first_admin_password),
        is_active=True,
    )
    db.add(admin_user)
    db.flush()

    admin_role = db.scalar(select(Role).where(Role.name == "admin"))
    if admin_role is None:
        raise RuntimeError("Perfil 'admin' não encontrado.")

    db.add(
        UserRole(
            user_id=admin_user.id,
            role_id=admin_role.id,
        )
    )

    db.commit()
    print(f"Usuário admin criado com email: {admin_user.email}")


def main():
    db = SessionLocal()
    try:
        seed_roles(db)
        seed_first_admin(db)
        print("Seed inicial concluído com sucesso.")
    finally:
        db.close()


if __name__ == "__main__":
    main()