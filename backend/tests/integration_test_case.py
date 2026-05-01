import os
import unittest
from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "cesta_digital_test")
os.environ.setdefault("DB_USER", "root")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("FIRST_ADMIN_NAME", "Admin")
os.environ.setdefault("FIRST_ADMIN_EMAIL", "admin@example.com")
os.environ.setdefault("FIRST_ADMIN_PASSWORD", "Admin@12345")
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-32-plus-chars")
os.environ.setdefault("EXTREME_POVERTY_MAX_INCOME_PER_CAPITA", "109")
os.environ.setdefault("POVERTY_MAX_INCOME_PER_CAPITA", "218")

from app.api.deps import get_db
from app.core.security import get_password_hash
from app.db.base import Base
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.services.auth_rate_limit_service import clear_login_rate_limits


ROLE_NAMES = ("admin", "lider_social", "operador")


class ApiIntegrationTestCase(unittest.TestCase):
    def setUp(self):
        clear_login_rate_limits()
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            future=True,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
            future=True,
        )

        def override_get_db() -> Generator[Session, None, None]:
            db = self.session_factory()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        self._seed_roles()

    def tearDown(self):
        clear_login_rate_limits()
        self.client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def _seed_roles(self) -> None:
        db = self.session_factory()
        try:
            for role_name in ROLE_NAMES:
                db.add(Role(name=role_name, description=f"Perfil {role_name}"))
            db.commit()
        finally:
            db.close()

    def create_user(
        self,
        *,
        name: str,
        email: str,
        password: str,
        roles: tuple[str, ...],
        is_active: bool = True,
    ) -> int:
        db = self.session_factory()
        try:
            user = User(
                name=name,
                email=email,
                password_hash=get_password_hash(password),
                is_active=is_active,
            )
            db.add(user)
            db.flush()

            role_rows = list(
                db.scalars(select(Role).where(Role.name.in_(roles))).all()
            )
            for role in role_rows:
                db.add(UserRole(user_id=user.id, role_id=role.id))

            db.commit()
            return user.id
        finally:
            db.close()

    def login_and_get_headers(self, email: str, password: str) -> dict[str, str]:
        response = self.client.post(
            "/auth/login",
            data={
                "username": email,
                "password": password,
                "grant_type": "password",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def create_family(self, headers: dict[str, str], **overrides) -> dict:
        payload = {
            "internal_code": "FAM-0001",
            "status": "em_analise",
            "registration_date": "2026-04-01",
            "last_evaluation_date": None,
            "next_revaluation_date": None,
            "monthly_income_total": 0,
            "monthly_essential_expenses": 0,
            "income_per_capita": 0,
            "receives_government_assistance": False,
            "attends_church": False,
            "church_name": None,
            "community_relationship": None,
            "responsible_education_level": None,
            "has_internet_access": False,
            "has_mobile_phone": True,
            "has_computer": False,
            "housing_type": "cedida",
            "has_water_supply": True,
            "has_electricity": True,
            "has_sanitation": True,
            "rooms_count": 2,
            "bedrooms_count": 1,
            "zip_code": "49000-000",
            "street": "Rua A",
            "number": "10",
            "complement": None,
            "neighborhood": "Centro",
            "city": "Aracaju",
            "state": "SE",
            "reference_point": None,
            "total_residents": 1,
            "total_adults": 1,
            "total_children": 0,
            "total_elderly": 0,
            "total_babies": 0,
            "has_pregnant_member": False,
            "has_disabled_member": False,
            "has_chronic_illness_member": False,
            "has_unemployed_member": False,
            "needs_extra_support": False,
            "social_notes": None,
            "internal_notes": None,
            "contacts": [],
        }
        payload.update(overrides)

        response = self.client.post("/families", json=payload, headers=headers)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def create_item_category(self, headers: dict[str, str], **overrides) -> dict:
        payload = {
            "name": "alimentos",
            "description": "Itens alimenticios",
        }
        payload.update(overrides)

        response = self.client.post("/item-categories", json=payload, headers=headers)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def create_item(self, headers: dict[str, str], **overrides) -> dict:
        category = self.create_item_category(headers)
        payload = {
            "category_id": category["id"],
            "name": "Arroz",
            "unit_measure": "kg",
            "tracks_expiration": False,
            "is_active": True,
            "reference_unit_value": 10,
            "minimum_stock_alert": 1,
            "notes": None,
        }
        payload.update(overrides)

        response = self.client.post("/items", json=payload, headers=headers)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def create_stock_batch(self, headers: dict[str, str], **overrides) -> dict:
        item = self.create_item(headers)
        payload = {
            "item_id": item["id"],
            "source_type": "doacao_item",
            "entry_quantity": 10,
            "entry_date": "2026-04-10",
            "expiration_date": None,
            "estimated_unit_value": 8,
            "notes": None,
        }
        payload.update(overrides)

        response = self.client.post("/stock-batches", json=payload, headers=headers)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def create_basket_type(self, headers: dict[str, str], **overrides) -> dict:
        payload = {
            "name": "Cesta Padrao",
            "is_active": True,
            "notes": None,
        }
        payload.update(overrides)

        response = self.client.post("/basket-types", json=payload, headers=headers)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()
