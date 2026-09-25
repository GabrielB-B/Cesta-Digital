from datetime import timedelta

from app.models.family import Family
from app.services.stock_availability_policy import operational_today
from integration_test_case import ApiIntegrationTestCase


class AssessmentQueueApiTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Liderança Social",
            email="social@example.com",
            password="Social@12345",
            roles=("lider_social",),
            login_name="social",
        )
        self.create_user(
            name="Operador",
            email="operador@example.com",
            password="Operador@12345",
            roles=("operador",),
            login_name="operador",
        )
        self.social_headers = self.login_and_get_headers("social", "Social@12345")
        self.operator_headers = self.login_and_get_headers(
            "operador",
            "Operador@12345",
        )
        self.today = operational_today()

    def _assessment_payload(self, *, next_revaluation_date):
        return {
            "assessment_date": (self.today - timedelta(days=60)).isoformat(),
            "final_decision": "apta_recorrente",
            "decision_reason": "Decisão técnica registrada no teste.",
            "exception_reason": None,
            "co_approved_by_user_id": None,
            "next_revaluation_date": (
                next_revaluation_date.isoformat()
                if next_revaluation_date is not None
                else None
            ),
            "technical_notes": None,
        }

    def _create_assessed_family(self, code: str, *, next_revaluation_date):
        family = self.create_family(self.social_headers, internal_code=code)
        response = self.client.post(
            f"/families/{family['id']}/assessments",
            json=self._assessment_payload(
                next_revaluation_date=next_revaluation_date,
            ),
            headers=self.social_headers,
        )
        self.assertEqual(response.status_code, 201, response.text)
        return family, response.json()

    def test_queue_is_paginated_counted_and_ordered_by_operational_urgency(self):
        never_assessed = self.create_family(
            self.social_headers,
            internal_code="FAM-SEM-AVALIACAO",
            neighborhood="Jardim Esperança",
        )
        self._create_assessed_family(
            "FAM-VENCIDA",
            next_revaluation_date=self.today - timedelta(days=1),
        )
        self._create_assessed_family(
            "FAM-PROXIMA",
            next_revaluation_date=self.today + timedelta(days=10),
        )
        current_family, latest_assessment = self._create_assessed_family(
            "FAM-EM-DIA",
            next_revaluation_date=self.today + timedelta(days=45),
        )
        self._create_assessed_family(
            "FAM-SEM-PRAZO",
            next_revaluation_date=None,
        )
        self.create_family(
            self.social_headers,
            internal_code="FAM-INATIVA",
            status="inativa",
        )

        db = self.session_factory()
        try:
            persisted = db.get(Family, current_family["id"])
            self.assertIsNotNone(persisted)
            persisted.income_per_capita = 999
            persisted.monthly_income_total = 999
            db.commit()
        finally:
            db.close()

        response = self.client.get(
            "/social-assessments/queue",
            headers=self.social_headers,
            params={"limit": 2, "offset": 0},
        )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(response.headers["x-total-count"], "5")
        self.assertEqual(body["total"], 5)
        self.assertEqual(len(body["items"]), 2)
        self.assertEqual(body["items"][0]["family_id"], never_assessed["id"])
        self.assertEqual(body["items"][0]["queue_status"], "sem_avaliacao")
        self.assertEqual(
            body["summary"],
            {
                "sem_avaliacao": 1,
                "reavaliacao_vencida": 2,
                "reavaliacao_proxima": 1,
                "em_dia": 1,
                "total": 5,
            },
        )
        self.assertEqual(body["reference_date"], self.today.isoformat())

        current_response = self.client.get(
            "/social-assessments/queue",
            headers=self.social_headers,
            params={"status": "em_dia"},
        )
        self.assertEqual(current_response.status_code, 200, current_response.text)
        current_item = current_response.json()["items"][0]
        self.assertEqual(current_response.headers["x-total-count"], "1")
        self.assertEqual(
            current_item["latest_assessment_id"],
            latest_assessment["id"],
        )
        self.assertEqual(current_item["latest_final_decision"], "apta_recorrente")
        self.assertEqual(current_item["current_system_suggestion"], "inapta")
        self.assertTrue(current_item["current_preview_differs_from_decision"])

    def test_queue_search_filter_validation_and_rbac(self):
        self.create_family(
            self.social_headers,
            internal_code="FAM-BUSCA",
            neighborhood="Jardim Primavera",
        )
        self.create_family(
            self.social_headers,
            internal_code="FAM-OUTRA",
            neighborhood="Centro",
        )

        search_response = self.client.get(
            "/social-assessments/queue",
            headers=self.social_headers,
            params={"q": "Primavera"},
        )
        self.assertEqual(search_response.status_code, 200, search_response.text)
        self.assertEqual(search_response.json()["total"], 1)
        self.assertEqual(
            search_response.json()["items"][0]["internal_code"],
            "FAM-BUSCA",
        )

        invalid_response = self.client.get(
            "/social-assessments/queue",
            headers=self.social_headers,
            params={"status": "andamento"},
        )
        self.assertEqual(invalid_response.status_code, 422, invalid_response.text)

        forbidden_response = self.client.get(
            "/social-assessments/queue",
            headers=self.operator_headers,
        )
        self.assertEqual(forbidden_response.status_code, 403, forbidden_response.text)

        self.client.cookies.clear()
        anonymous_response = self.client.get("/social-assessments/queue")
        self.assertEqual(anonymous_response.status_code, 401, anonymous_response.text)

    def test_assessment_score_is_server_owned_and_mismatch_is_rejected(self):
        family = self.create_family(
            self.social_headers,
            internal_code="FAM-SCORE-SERVIDOR",
            total_residents=1,
            total_adults=0,
            total_children=1,
            has_sanitation=False,
        )
        payload = self._assessment_payload(
            next_revaluation_date=self.today + timedelta(days=90),
        )
        payload["vulnerability_score"] = 99

        rejected_response = self.client.post(
            f"/families/{family['id']}/assessments",
            json=payload,
            headers=self.social_headers,
        )
        self.assertEqual(rejected_response.status_code, 422, rejected_response.text)
        self.assertIn("calculada pelo servidor", rejected_response.json()["detail"])

        payload.pop("vulnerability_score")
        accepted_response = self.client.post(
            f"/families/{family['id']}/assessments",
            json=payload,
            headers=self.social_headers,
        )
        self.assertEqual(accepted_response.status_code, 201, accepted_response.text)
        self.assertEqual(accepted_response.json()["vulnerability_score"], 2)
