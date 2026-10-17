from datetime import date
from decimal import Decimal

from sqlalchemy import select

from integration_test_case import ApiIntegrationTestCase
from app.models.family import Family
from app.models.social_assessment import SocialAssessment
from app.models.user import User


class CollaboratorAccessApiIntegrationTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Colaborador API",
            email="colaborador@example.com",
            password="Colaborador@123",
            roles=("colaborador",),
        )
        self.headers = self.login_and_get_headers("colaborador", "Colaborador@123")

    def test_collaborator_can_access_daily_operation_collections(self):
        for path in (
            "/dashboard/overview",
            "/families",
            "/items",
            "/stock-batches",
            "/stock-movements",
            "/stock-summary",
            "/deliveries",
            "/delivery-schedules",
            "/item-categories",
            "/basket-types",
        ):
            with self.subTest(path=path):
                response = self.client.get(path, headers=self.headers)
                self.assertEqual(response.status_code, 200, f"{path}: {response.text}")

    def test_collaborator_cannot_access_social_decisions_reports_or_administration(self):
        for path in (
            "/social-assessments/queue",
            "/reports/overview",
            "/financial-summary",
            "/users",
            "/users/roles",
            "/audit-logs",
        ):
            with self.subTest(path=path):
                response = self.client.get(path, headers=self.headers)
                self.assertEqual(response.status_code, 403, f"{path}: {response.text}")

    def test_collaborator_can_read_but_cannot_change_configuration(self):
        categories = self.client.get("/item-categories", headers=self.headers)
        baskets = self.client.get("/basket-types", headers=self.headers)
        self.assertEqual(categories.status_code, 200, categories.text)
        self.assertEqual(baskets.status_code, 200, baskets.text)

        create_category = self.client.post(
            "/item-categories",
            headers=self.headers,
            json={"name": "Categoria restrita", "is_active": True},
        )
        create_basket = self.client.post(
            "/basket-types",
            headers=self.headers,
            json={"name": "Cesta restrita", "is_active": True},
        )

        self.assertEqual(create_category.status_code, 403, create_category.text)
        self.assertEqual(create_basket.status_code, 403, create_basket.text)

    def test_collaborator_cannot_read_assessment_history_or_update_social_status(self):
        family = self.create_family(self.headers)
        with self.session_factory() as db:
            collaborator = db.scalar(select(User).where(User.login_name == "colaborador"))
            stored_family = db.get(Family, family["id"])
            self.assertIsNotNone(collaborator)
            self.assertIsNotNone(stored_family)
            stored_family.next_revaluation_date = date(2026, 10, 20)
            db.add(
                SocialAssessment(
                    family_id=family["id"],
                    assessment_date=date(2026, 10, 17),
                    monthly_income_total_at_time=Decimal("500.00"),
                    income_per_capita_at_time=Decimal("125.00"),
                    vulnerability_score=8,
                    system_suggestion="apta_recorrente",
                    final_decision="apta_recorrente",
                    approved_by_user_id=collaborator.id,
                )
            )
            db.commit()

        detail = self.client.get(f"/families/{family['id']}", headers=self.headers)
        dashboard = self.client.get("/dashboard/overview", headers=self.headers)
        status_update = self.client.patch(
            f"/families/{family['id']}/status",
            headers=self.headers,
            json={"status": "em_analise", "internal_notes": None},
        )

        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertEqual(detail.json()["assessments"], [])
        self.assertEqual(dashboard.status_code, 200, dashboard.text)
        self.assertEqual(dashboard.json()["upcoming_revaluations_count"], 0)
        self.assertEqual(dashboard.json()["upcoming_revaluations"], [])
        self.assertEqual(status_update.status_code, 403, status_update.text)
