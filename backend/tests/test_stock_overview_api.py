from datetime import date, timedelta
from unittest.mock import patch

from integration_test_case import ApiIntegrationTestCase


TEST_OPERATIONAL_DATE = date(2026, 8, 20)


class StockOverviewApiTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Operador de Estoque",
            email="estoque@example.com",
            password="Estoque@12345",
            roles=("operador",),
            login_name="estoque",
        )
        self.create_user(
            name="Liderança Social",
            email="social-estoque@example.com",
            password="Social@12345",
            roles=("lider_social",),
            login_name="social-estoque",
        )
        self.operator_headers = self.login_and_get_headers(
            "estoque",
            "Estoque@12345",
        )
        self.social_headers = self.login_and_get_headers(
            "social-estoque",
            "Social@12345",
        )
        self.category = self.create_item_category(
            self.operator_headers,
            name="Alimentos",
        )

    def _create_item(self, *, name: str, minimum: int) -> dict:
        response = self.client.post(
            "/items",
            headers=self.operator_headers,
            json={
                "category_id": self.category["id"],
                "name": name,
                "unit_measure": "unidade",
                "tracks_expiration": True,
                "is_active": True,
                "reference_unit_value": 5,
                "minimum_stock_alert": minimum,
                "notes": None,
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def _create_batch(
        self,
        *,
        item_id: int,
        quantity: int,
        expiration_date,
        status: str = "disponivel",
    ) -> dict:
        response = self.client.post(
            "/stock-batches",
            headers=self.operator_headers,
            json={
                "item_id": item_id,
                "source_type": "doacao_item",
                "status": status,
                "entry_quantity": quantity,
                "entry_date": (TEST_OPERATIONAL_DATE - timedelta(days=30)).isoformat(),
                "expiration_date": expiration_date.isoformat(),
                "quarantine_reason": (
                    "Em inspeção de qualidade" if status != "disponivel" else None
                ),
                "estimated_unit_value": 5,
                "notes": None,
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    @patch(
        "app.services.stock_summary_service.operational_today",
        return_value=TEST_OPERATIONAL_DATE,
    )
    def test_overview_uses_global_counts_and_usable_balance(self, _mocked_today):
        milk = self._create_item(name="Leite Integral 1L", minimum=30)
        beans = self._create_item(name="Feijão Carioca 1kg", minimum=1)
        rice = self._create_item(name="Arroz Branco 5kg", minimum=5)
        restricted = self._create_item(name="Óleo em inspeção", minimum=1)

        self._create_batch(
            item_id=milk["id"],
            quantity=24,
            expiration_date=TEST_OPERATIONAL_DATE + timedelta(days=10),
        )
        self._create_batch(
            item_id=beans["id"],
            quantity=3,
            expiration_date=TEST_OPERATIONAL_DATE - timedelta(days=1),
        )
        self._create_batch(
            item_id=rice["id"],
            quantity=42,
            expiration_date=TEST_OPERATIONAL_DATE + timedelta(days=90),
        )
        self._create_batch(
            item_id=restricted["id"],
            quantity=5,
            expiration_date=TEST_OPERATIONAL_DATE + timedelta(days=90),
            status="quarentena",
        )

        response = self.client.get(
            "/stock-overview",
            headers=self.operator_headers,
            params={"limit": 2, "offset": 0},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.headers["x-total-count"], "4")
        body = response.json()
        self.assertEqual(body["total"], 4)
        self.assertEqual(len(body["items"]), 2)
        self.assertEqual(body["reference_date"], TEST_OPERATIONAL_DATE.isoformat())
        self.assertEqual(
            body["summary"],
            {
                "total_items": 4,
                "active_items": 4,
                "low_stock_items": 3,
                "expiring_soon_batches": 1,
                "expired_batches": 1,
                "missing_expiration_batches": 0,
                "restricted_batches": 1,
            },
        )

        items = {item["item_name"]: item for item in body["items"]}
        self.assertEqual(items["Feijão Carioca 1kg"]["total_quantity"], 0)
        self.assertEqual(items["Feijão Carioca 1kg"]["expired_batches"], 1)
        self.assertIsNone(items["Feijão Carioca 1kg"]["next_expiration_date"])
        self.assertEqual(items["Leite Integral 1L"]["total_quantity"], 24)
        self.assertEqual(items["Leite Integral 1L"]["expiring_soon_batches"], 1)
        self.assertEqual(
            items["Leite Integral 1L"]["next_expiration_date"],
            (TEST_OPERATIONAL_DATE + timedelta(days=10)).isoformat(),
        )

    @patch(
        "app.services.stock_summary_service.operational_today",
        return_value=TEST_OPERATIONAL_DATE,
    )
    def test_overview_filters_search_attention_and_validates_rbac(self, _mocked_today):
        milk = self._create_item(name="Leite Integral 1L", minimum=30)
        rice = self._create_item(name="Arroz Branco 5kg", minimum=5)
        self._create_batch(
            item_id=milk["id"],
            quantity=24,
            expiration_date=TEST_OPERATIONAL_DATE + timedelta(days=10),
        )
        self._create_batch(
            item_id=rice["id"],
            quantity=42,
            expiration_date=TEST_OPERATIONAL_DATE + timedelta(days=90),
        )

        search_response = self.client.get(
            "/stock-overview",
            headers=self.operator_headers,
            params={"q": "Leite"},
        )
        self.assertEqual(search_response.status_code, 200, search_response.text)
        self.assertEqual(search_response.json()["total"], 1)
        self.assertEqual(
            search_response.json()["items"][0]["item_name"],
            "Leite Integral 1L",
        )

        attention_response = self.client.get(
            "/stock-overview",
            headers=self.operator_headers,
            params={"attention": "vencendo_em_breve"},
        )
        self.assertEqual(attention_response.status_code, 200)
        self.assertEqual(attention_response.json()["total"], 1)
        self.assertEqual(
            attention_response.json()["items"][0]["item_id"],
            milk["id"],
        )

        invalid_response = self.client.get(
            "/stock-overview",
            headers=self.operator_headers,
            params={"attention": "qualquer"},
        )
        self.assertEqual(invalid_response.status_code, 422)

        forbidden_response = self.client.get(
            "/stock-overview",
            headers=self.social_headers,
        )
        self.assertEqual(forbidden_response.status_code, 403)

        self.client.cookies.clear()
        anonymous_response = self.client.get("/stock-overview")
        self.assertEqual(anonymous_response.status_code, 401)
