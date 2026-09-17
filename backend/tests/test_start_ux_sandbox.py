from pathlib import Path
import os
import sys
import unittest

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.update(
    {
        "APP_ENV": "test",
        "DB_HOST": "127.0.0.1",
        "DB_NAME": "cesta_test",
        "DB_USER": "cesta_test",
        "DB_PASSWORD": "cesta_test",
        "DB_SSL_REQUIRED": "false",
        "FIRST_ADMIN_NAME": "Administrador",
        "FIRST_ADMIN_LOGIN_NAME": "admin",
        "FIRST_ADMIN_EMAIL": "admin@example.invalid",
        "FIRST_ADMIN_PASSWORD": "SenhaUnica@123",
        "SECRET_KEY": "test-secret-key",
    }
)

from app.db.base import Base
from app.models.family import Family
from app.models.item_category import ItemCategory
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from scripts.start_ux_sandbox import seed_minimal_data


class MinimalUxSandboxSeedTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(
            bind=self.engine,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )
        self.access = {
            "login_name": "ux.admin",
            "password": "UX#TesteSeguro123a",
            "secret_key": "test-secret",
        }

    def tearDown(self) -> None:
        self.engine.dispose()

    def scalar_count(self, model) -> int:
        with self.session_factory() as db:
            return int(db.scalar(select(func.count()).select_from(model)) or 0)

    def test_minimal_seed_creates_only_structural_access(self) -> None:
        seed_minimal_data(self.session_factory, self.access)

        self.assertEqual(self.scalar_count(Role), 3)
        self.assertEqual(self.scalar_count(User), 1)
        self.assertEqual(self.scalar_count(UserRole), 1)
        self.assertEqual(self.scalar_count(ItemCategory), 0)
        self.assertEqual(self.scalar_count(Family), 0)

        with self.session_factory() as db:
            admin = db.scalar(select(User))
            self.assertIsNotNone(admin)
            self.assertEqual(admin.login_name, "ux.admin")
            self.assertTrue(admin.is_active)

    def test_minimal_seed_is_idempotent(self) -> None:
        seed_minimal_data(self.session_factory, self.access)
        seed_minimal_data(self.session_factory, self.access)

        self.assertEqual(self.scalar_count(Role), 3)
        self.assertEqual(self.scalar_count(User), 1)
        self.assertEqual(self.scalar_count(UserRole), 1)


if __name__ == "__main__":
    unittest.main()
