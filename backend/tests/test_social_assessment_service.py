import os
import unittest
from datetime import date
from decimal import Decimal

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "cesta_digital_test")
os.environ.setdefault("DB_USER", "root")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("FIRST_ADMIN_NAME", "Admin")
os.environ.setdefault("FIRST_ADMIN_EMAIL", "admin@example.com")
os.environ.setdefault("FIRST_ADMIN_PASSWORD", "Admin@12345")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("EXTREME_POVERTY_MAX_INCOME_PER_CAPITA", "109")
os.environ.setdefault("POVERTY_MAX_INCOME_PER_CAPITA", "218")

from app.db.base import Base
from app.models.audit_log import AuditLog
from app.models.family import Family
from app.models.role import Role
from app.models.social_assessment import SocialAssessment
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.social_assessment import SocialAssessmentCreate
from app.services.social_assessment_service import create_social_assessment


class SocialAssessmentServiceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, future=True)
        self.db: Session = self.session_factory()

        role = Role(name="lider_social", description="Lideranca social")
        self.db.add(role)
        self.db.flush()

        self.user = User(
            name="Tecnica Social",
            email="social@example.com",
            password_hash="hash",
            is_active=True,
        )
        self.db.add(self.user)
        self.db.flush()
        self.db.add(UserRole(user_id=self.user.id, role_id=role.id))

        self.family = Family(
            internal_code="FAM-0001",
            status="em_analise",
            registration_date=date(2026, 4, 1),
            last_evaluation_date=None,
            next_revaluation_date=None,
            monthly_income_total=Decimal("300.00"),
            monthly_essential_expenses=Decimal("200.00"),
            income_per_capita=Decimal("100.00"),
            receives_government_assistance=False,
            housing_type="cedida",
            has_water_supply=True,
            has_electricity=True,
            has_sanitation=False,
            rooms_count=3,
            bedrooms_count=2,
            zip_code="49000-000",
            street="Rua A",
            number="10",
            complement=None,
            neighborhood="Centro",
            city="Aracaju",
            state="SE",
            reference_point=None,
            total_residents=3,
            total_adults=2,
            total_children=1,
            total_elderly=0,
            total_babies=0,
            has_pregnant_member=False,
            has_disabled_member=False,
            has_chronic_illness_member=False,
            has_unemployed_member=False,
            needs_extra_support=False,
            attends_church=False,
            church_name=None,
            community_relationship=None,
            responsible_education_level=None,
            has_internet_access=False,
            has_mobile_phone=True,
            has_computer=False,
            social_notes=None,
            internal_notes=None,
            created_by_user_id=self.user.id,
            updated_by_user_id=self.user.id,
        )
        self.db.add(self.family)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_create_social_assessment_stores_income_snapshot_and_audit(self):
        payload = SocialAssessmentCreate(
            assessment_date=date(2026, 4, 6),
            vulnerability_score=2,
            final_decision="apta_recorrente",
            decision_reason=None,
            exception_reason=None,
            co_approved_by_user_id=None,
            next_revaluation_date=date(2026, 5, 6),
            technical_notes="Acompanhamento inicial.",
        )

        assessment = create_social_assessment(
            self.db,
            self.family.id,
            payload,
            self.user,
        )

        persisted = self.db.scalar(
            select(SocialAssessment).where(SocialAssessment.id == assessment.id)
        )

        self.assertIsNotNone(persisted)
        self.assertEqual(persisted.monthly_income_total_at_time, Decimal("300.00"))
        self.assertEqual(persisted.income_per_capita_at_time, Decimal("100.00"))

        refreshed_family = self.db.get(Family, self.family.id)
        self.assertEqual(refreshed_family.status, "apta_recorrente")
        self.assertEqual(refreshed_family.last_evaluation_date, date(2026, 4, 6))

        audit = self.db.scalar(
            select(AuditLog).where(
                AuditLog.event_type == "social_assessment.created"
            )
        )
        self.assertIsNotNone(audit)
        self.assertEqual(audit.entity_id, str(assessment.id))
