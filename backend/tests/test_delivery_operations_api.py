from datetime import date, timedelta
from unittest.mock import patch

from integration_test_case import ApiIntegrationTestCase


TEST_OPERATIONAL_DATE = date(2026, 8, 21)


class DeliveryOperationsApiTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Operador de Entregas",
            email="entregas@example.com",
            password="Entregas@12345",
            roles=("admin", "operador", "lider_social"),
            login_name="entregas",
        )
        self.create_user(
            name="Liderança Social",
            email="social-entregas@example.com",
            password="Social@12345",
            roles=("lider_social",),
            login_name="social-entregas",
        )
        self.operator_headers = self.login_and_get_headers(
            "entregas", "Entregas@12345"
        )
        self.social_headers = self.login_and_get_headers(
            "social-entregas", "Social@12345"
        )
        self.basket = self.create_basket_type(
            self.operator_headers,
            name="Cesta Essencial",
        )
        item = self.create_item(
            self.operator_headers,
            name="Arroz para agenda",
            tracks_expiration=False,
        )
        batch_response = self.client.post(
            "/stock-batches",
            headers=self.operator_headers,
            json={
                "item_id": item["id"],
                "source_type": "doacao_item",
                "entry_quantity": 10,
                "entry_date": "2026-08-01",
                "expiration_date": None,
                "estimated_unit_value": 5,
                "notes": None,
            },
        )
        self.assertEqual(batch_response.status_code, 201, batch_response.text)
        recipe_response = self.client.post(
            f"/basket-types/{self.basket['id']}/items",
            headers=self.operator_headers,
            json={"item_id": item["id"], "required_quantity": 1},
        )
        self.assertEqual(recipe_response.status_code, 201, recipe_response.text)

    def _create_schedule(
        self,
        *,
        code: str,
        scheduled_date: date,
        status: str,
        street: str = "Rua das Flores",
        neighborhood: str = "Jardim Primavera",
    ) -> dict:
        family = self.create_family(
            self.operator_headers,
            internal_code=code,
            street=street,
            neighborhood=neighborhood,
            city="São Paulo",
            state="SP",
        )
        response = self.client.post(
            "/delivery-schedules",
            headers=self.operator_headers,
            json={
                "family_id": family["id"],
                "basket_type_id": self.basket["id"],
                "scheduled_date": scheduled_date.isoformat(),
                "status": status,
                "notes": f"Agenda {code}",
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    @patch(
        "app.services.delivery_service.operational_today",
        return_value=TEST_OPERATIONAL_DATE,
    )
    def test_overview_enriches_rows_and_uses_global_period_counts(self, _mocked_today):
        self._create_schedule(
            code="FAM-HOJE-01",
            scheduled_date=TEST_OPERATIONAL_DATE,
            status="agendado",
        )
        self._create_schedule(
            code="FAM-HOJE-02",
            scheduled_date=TEST_OPERATIONAL_DATE,
            status="reagendado",
        )
        self._create_schedule(
            code="FAM-HOJE-03",
            scheduled_date=TEST_OPERATIONAL_DATE,
            status="cancelado",
        )
        self._create_schedule(
            code="FAM-AMANHA",
            scheduled_date=TEST_OPERATIONAL_DATE + timedelta(days=1),
            status="agendado",
        )

        response = self.client.get(
            "/delivery-operations",
            headers=self.operator_headers,
            params={"period": "hoje", "limit": 2},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.headers["x-total-count"], "3")
        body = response.json()
        self.assertEqual(body["reference_date"], TEST_OPERATIONAL_DATE.isoformat())
        self.assertEqual(body["period"], "hoje")
        self.assertEqual(body["total"], 3)
        self.assertEqual(len(body["items"]), 2)
        self.assertEqual(
            body["summary"],
            {
                "scheduled": 1,
                "rescheduled": 1,
                "completed": 0,
                "exceptions": 1,
                "total": 3,
            },
        )
        first_item = body["items"][0]
        self.assertEqual(first_item["family_code"], "FAM-HOJE-01")
        self.assertEqual(first_item["family_status"], "em_analise")
        self.assertEqual(first_item["basket_type_name"], "Cesta Essencial")
        self.assertEqual(first_item["street"], "Rua das Flores")
        self.assertEqual(first_item["neighborhood"], "Jardim Primavera")

    @patch(
        "app.services.delivery_service.operational_today",
        return_value=TEST_OPERATIONAL_DATE,
    )
    def test_overview_filters_period_search_status_and_rbac(self, _mocked_today):
        self._create_schedule(
            code="FAM-CENTRO",
            scheduled_date=TEST_OPERATIONAL_DATE,
            status="faltou",
            street="Avenida Central",
            neighborhood="Centro",
        )
        self._create_schedule(
            code="FAM-FUTURA",
            scheduled_date=TEST_OPERATIONAL_DATE + timedelta(days=3),
            status="agendado",
        )

        search_response = self.client.get(
            "/delivery-operations",
            headers=self.operator_headers,
            params={"period": "semana", "q": "Central", "status": "ocorrencia"},
        )
        self.assertEqual(search_response.status_code, 200, search_response.text)
        self.assertEqual(search_response.json()["total"], 1)
        self.assertEqual(
            search_response.json()["items"][0]["family_code"],
            "FAM-CENTRO",
        )

        tomorrow_response = self.client.get(
            "/delivery-operations",
            headers=self.operator_headers,
            params={"period": "amanha"},
        )
        self.assertEqual(tomorrow_response.status_code, 200)
        self.assertEqual(tomorrow_response.json()["total"], 0)

        invalid_response = self.client.get(
            "/delivery-operations",
            headers=self.operator_headers,
            params={"period": "mes"},
        )
        self.assertEqual(invalid_response.status_code, 422)

        forbidden_response = self.client.get(
            "/delivery-operations",
            headers=self.social_headers,
        )
        self.assertEqual(forbidden_response.status_code, 403)

        self.client.cookies.clear()
        anonymous_response = self.client.get("/delivery-operations")
        self.assertEqual(anonymous_response.status_code, 401)
