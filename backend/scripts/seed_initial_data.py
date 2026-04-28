from pathlib import Path
import sys

from sqlalchemy import select

BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.core.security import get_password_hash, validate_password_strength
from app.db.session import SessionLocal
from app.models.item_category import ItemCategory
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole


ROLE_NAMES = ["admin", "lider_social", "operador"]
DEFAULT_ITEM_CATEGORIES = [
    ("alimentos", "Itens alimenticios de cesta e estoque."),
    ("higiene", "Itens de higiene pessoal."),
    ("limpeza", "Itens de limpeza domestica."),
]


def seed_roles(db):
    existing_roles = db.scalars(select(Role)).all()
    existing_role_names = {role.name for role in existing_roles}

    for role_name in ROLE_NAMES:
        if role_name not in existing_role_names:
            db.add(Role(name=role_name, description=f"Perfil {role_name}"))

    db.commit()


def seed_first_admin(db):
    if not settings.bootstrap_admin_enabled:
        print("Bootstrap de admin desabilitado por ambiente.")
        return

    existing_admin = db.scalar(
        select(User).where(User.email == settings.first_admin_email)
    )

    if existing_admin:
        print(f"Usuario admin ja existe: {existing_admin.email}")
        return

    admin_password = validate_password_strength(settings.first_admin_password)
    if settings.app_env in {"staging", "production"} and admin_password == "Admin@123456":
        raise RuntimeError(
            "Defina FIRST_ADMIN_PASSWORD com um valor exclusivo antes de rodar o seed."
        )

    admin_user = User(
        name=settings.first_admin_name,
        email=settings.first_admin_email,
        password_hash=get_password_hash(admin_password),
        is_active=True,
    )
    db.add(admin_user)
    db.flush()

    admin_role = db.scalar(select(Role).where(Role.name == "admin"))
    if admin_role is None:
        raise RuntimeError("Perfil 'admin' nao encontrado.")

    db.add(
        UserRole(
            user_id=admin_user.id,
            role_id=admin_role.id,
        )
    )

    db.commit()
    print(f"Usuario admin criado com email: {admin_user.email}")


def seed_item_categories(db):
    existing_categories = db.scalars(select(ItemCategory)).all()
    existing_category_names = {category.name for category in existing_categories}

    for name, description in DEFAULT_ITEM_CATEGORIES:
        if name not in existing_category_names:
            db.add(ItemCategory(name=name, description=description))

    db.commit()


def main():
    db = SessionLocal()
    try:
        seed_roles(db)
        seed_first_admin(db)
        seed_item_categories(db)
        print("Seed inicial concluido com sucesso.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
