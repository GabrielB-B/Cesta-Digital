import os
import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "cesta_digital_test")
os.environ.setdefault("DB_USER", "root")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("FIRST_ADMIN_NAME", "Admin")
os.environ.setdefault("FIRST_ADMIN_LOGIN_NAME", "admin")
os.environ.setdefault("FIRST_ADMIN_EMAIL", "admin@example.com")
os.environ.setdefault("FIRST_ADMIN_PASSWORD", "Admin@12345")
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-32-plus-chars")

from app.core.security import get_password_hash, verify_password
from app.db.base import Base
from app.models.audit_log import AuditLog
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.user_admin import UserCreate, UserPasswordReset, UserUpdate
from app.services.user_admin_service import create_user, reset_user_password, update_user


class UserAdminServiceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, future=True)
        self.db: Session = self.session_factory()

        self.db.add_all(
            [
                Role(name="admin", description="Administrador"),
                Role(name="lider_social", description="Lideranca social"),
                Role(name="operador", description="Operacao"),
            ]
        )
        self.db.flush()

        self.admin_user = User(
            name="Administrador",
            login_name="admin",
            email="admin@example.com",
            password_hash=get_password_hash("Admin@12345"),
            is_active=True,
        )
        self.db.add(self.admin_user)
        self.db.flush()
        self.db.add(UserRole(user_id=self.admin_user.id, role_id=1))
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_create_user_persists_roles_hashes_password_and_audit(self):
        payload = UserCreate(
            name="Maria Silva",
            login_name="maria",
            email="maria@example.com",
            password="Senha@Segura123",
            is_active=True,
            roles=["admin", "operador"],
        )

        result = create_user(self.db, payload, self.admin_user)

        self.assertEqual(result["email"], "maria@example.com")
        self.assertEqual(result["login_name"], "maria")
        self.assertEqual(sorted(result["roles"]), ["admin", "operador"])

        user = self.db.scalar(select(User).where(User.login_name == "maria"))
        self.assertIsNotNone(user)
        self.assertTrue(verify_password("Senha@Segura123", user.password_hash))

        user_roles = list(
            self.db.scalars(select(UserRole).where(UserRole.user_id == user.id)).all()
        )
        self.assertEqual(len(user_roles), 2)

        audit = self.db.scalar(select(AuditLog).where(AuditLog.event_type == "user.created"))
        self.assertIsNotNone(audit)
        self.assertEqual(audit.actor_user_id, self.admin_user.id)

    def test_update_user_replaces_roles_status_and_audit(self):
        created = create_user(
            self.db,
            UserCreate(
                name="Joao",
                login_name="joao",
                email="joao@example.com",
                password="Senha@Segura123",
                is_active=True,
                roles=["operador"],
            ),
            self.admin_user,
        )

        updated = update_user(
            self.db,
            created["id"],
            UserUpdate(
                name="Joao Atualizado",
                login_name="joao.atualizado",
                email="joao.atualizado@example.com",
                is_active=False,
                roles=["lider_social"],
            ),
            self.admin_user,
        )

        self.assertEqual(updated["name"], "Joao Atualizado")
        self.assertEqual(updated["login_name"], "joao.atualizado")
        self.assertEqual(updated["email"], "joao.atualizado@example.com")
        self.assertFalse(updated["is_active"])
        self.assertEqual(updated["roles"], ["lider_social"])

        audit = self.db.scalar(select(AuditLog).where(AuditLog.event_type == "user.updated"))
        self.assertIsNotNone(audit)
        self.assertEqual(audit.entity_id, str(created["id"]))

    def test_reset_user_password_updates_hash_and_audit(self):
        created = create_user(
            self.db,
            UserCreate(
                name="Ana",
                login_name="ana",
                email="ana@example.com",
                password="Senha@Inicial123",
                is_active=True,
                roles=["admin"],
            ),
            self.admin_user,
        )

        reset_user_password(
            self.db,
            created["id"],
            UserPasswordReset(new_password="Senha@Nova456"),
            self.admin_user,
        )

        user = self.db.scalar(select(User).where(User.id == created["id"]))
        self.assertIsNotNone(user)
        self.assertTrue(verify_password("Senha@Nova456", user.password_hash))

        audit = self.db.scalar(
            select(AuditLog).where(AuditLog.event_type == "user.password_reset")
        )
        self.assertIsNotNone(audit)
        self.assertEqual(audit.entity_id, str(created["id"]))

    def test_update_user_prevents_admin_from_disabling_self(self):
        with self.assertRaises(HTTPException) as context:
            update_user(
                self.db,
                self.admin_user.id,
                UserUpdate(
                    name="Administrador",
                    login_name="admin",
                    email="admin@example.com",
                    is_active=False,
                    roles=["admin"],
                ),
                self.admin_user,
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("proprio usuario", context.exception.detail)

    def test_update_user_prevents_removing_last_active_admin(self):
        created = create_user(
            self.db,
            UserCreate(
                name="Segundo Admin",
                login_name="segundo.admin",
                email="segundo.admin@example.com",
                password="Senha@Inicial123",
                is_active=True,
                roles=["admin"],
            ),
            self.admin_user,
        )
        second_admin = self.db.get(User, created["id"])
        self.assertIsNotNone(second_admin)

        update_user(
            self.db,
            self.admin_user.id,
            UserUpdate(
                name="Administrador",
                login_name="admin",
                email="admin@example.com",
                is_active=False,
                roles=["admin"],
            ),
            second_admin,
        )

        with self.assertRaises(HTTPException) as context:
            update_user(
                self.db,
                created["id"],
                UserUpdate(
                    name="Segundo Admin",
                    login_name="segundo.admin",
                    email="segundo.admin@example.com",
                    is_active=False,
                    roles=["admin"],
                ),
                self.admin_user,
            )

        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("administrador ativo", context.exception.detail)
