from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from app.models.stock_batch import StockBatch
from integration_test_case import ApiIntegrationTestCase


TEST_OPERATIONAL_DATE = date(2026, 7, 14)


class StockApiIntegrationTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Operador Estoque",
            email="admin@example.com",
            password="Admin@12345",
            roles=("admin", "operador"),
        )
        self.headers = self.login_and_get_headers("admin", "Admin@12345")

    def _create_batch_for_item(
        self,
        *,
        item_id: int,
        entry_quantity: int,
        entry_date,
        expiration_date,
        estimated_unit_value: int,
    ) -> dict:
        response = self.client.post(
            "/stock-batches",
            json={
                "item_id": item_id,
                "source_type": "doacao_item",
                "entry_quantity": entry_quantity,
                "entry_date": entry_date.isoformat(),
                "expiration_date": (
                    expiration_date.isoformat()
                    if expiration_date is not None
                    else None
                ),
                "estimated_unit_value": estimated_unit_value,
                "notes": None,
            },
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_stock_batch_and_manual_movement_update_balance(self):
        batch = self.create_stock_batch(self.headers)

        movement_response = self.client.post(
            "/stock-movements",
            json={
                "batch_id": batch["id"],
                "movement_type": "saida_manual",
                "quantity": 4,
                "notes": "Separacao operacional",
            },
            headers=self.headers,
        )

        self.assertEqual(movement_response.status_code, 201, movement_response.text)

        batches_response = self.client.get("/stock-batches", headers=self.headers)
        self.assertEqual(batches_response.status_code, 200, batches_response.text)
        persisted_batch = batches_response.json()[0]
        self.assertEqual(persisted_batch["current_quantity"], 6)

        paginated_batches_response = self.client.get(
            "/stock-batches",
            headers=self.headers,
            params={"item_id": batch["item_id"], "limit": 1, "offset": 0},
        )
        self.assertEqual(paginated_batches_response.status_code, 200)
        self.assertEqual(paginated_batches_response.headers["x-total-count"], "1")

        summary_response = self.client.get("/stock-summary", headers=self.headers)
        self.assertEqual(summary_response.status_code, 200, summary_response.text)
        self.assertEqual(summary_response.json()[0]["total_quantity"], 6)

    def test_stock_movement_rejects_quantity_above_available_balance(self):
        batch = self.create_stock_batch(self.headers, entry_quantity=3)

        movement_response = self.client.post(
            "/stock-movements",
            json={
                "batch_id": batch["id"],
                "movement_type": "saida_manual",
                "quantity": 5,
                "notes": "Tentativa invalida",
            },
            headers=self.headers,
        )

        self.assertEqual(movement_response.status_code, 400, movement_response.text)
        self.assertIn("saldo disponivel", movement_response.json()["detail"])

    @patch(
        "app.services.stock_availability_policy.operational_today",
        return_value=TEST_OPERATIONAL_DATE,
    )
    def test_manual_output_rejects_unusable_batch_but_controlled_losses_remain_allowed(
        self,
        _mocked_today,
    ):
        today = TEST_OPERATIONAL_DATE
        expired_date = today - timedelta(days=1)
        item = self.create_item(self.headers, tracks_expiration=False)
        expired_batch = self._create_batch_for_item(
            item_id=item["id"],
            entry_quantity=4,
            entry_date=expired_date - timedelta(days=1),
            expiration_date=expired_date,
            estimated_unit_value=1,
        )
        no_expiration_batch = self._create_batch_for_item(
            item_id=item["id"],
            entry_quantity=4,
            entry_date=today,
            expiration_date=None,
            estimated_unit_value=1,
        )

        manual_output_response = self.client.post(
            "/stock-movements",
            json={
                "batch_id": expired_batch["id"],
                "movement_type": "saida_manual",
                "quantity": 1,
                "notes": "Nao deve consumir vencido",
            },
            headers=self.headers,
        )
        self.assertEqual(manual_output_response.status_code, 400)
        self.assertIn("lote utilizavel", manual_output_response.json()["detail"])

        expiration_loss_response = self.client.post(
            "/stock-movements",
            json={
                "batch_id": expired_batch["id"],
                "movement_type": "perda_validade",
                "quantity": 2,
                "notes": "Descarte controlado",
            },
            headers=self.headers,
        )
        self.assertEqual(expiration_loss_response.status_code, 201, expiration_loss_response.text)

        item_update_response = self.client.put(
            f"/items/{item['id']}",
            json={
                "category_id": item["category_id"],
                "name": item["name"],
                "unit_measure": item["unit_measure"],
                "tracks_expiration": True,
                "is_active": True,
                "reference_unit_value": item["reference_unit_value"],
                "minimum_stock_alert": item["minimum_stock_alert"],
                "notes": item["notes"],
            },
            headers=self.headers,
        )
        self.assertEqual(item_update_response.status_code, 200, item_update_response.text)

        missing_expiration_output_response = self.client.post(
            "/stock-movements",
            json={
                "batch_id": no_expiration_batch["id"],
                "movement_type": "saida_manual",
                "quantity": 1,
                "notes": "Lote legado incoerente",
            },
            headers=self.headers,
        )
        self.assertEqual(missing_expiration_output_response.status_code, 400)
        self.assertIn(
            "lote utilizavel",
            missing_expiration_output_response.json()["detail"],
        )

        missing_expiration_loss_response = self.client.post(
            "/stock-movements",
            json={
                "batch_id": no_expiration_batch["id"],
                "movement_type": "perda_validade",
                "quantity": 1,
                "notes": "Retirada controlada de lote legado sem validade",
            },
            headers=self.headers,
        )
        self.assertEqual(
            missing_expiration_loss_response.status_code,
            201,
            missing_expiration_loss_response.text,
        )

        negative_adjustment_response = self.client.post(
            "/stock-movements",
            json={
                "batch_id": no_expiration_batch["id"],
                "movement_type": "ajuste_negativo",
                "quantity": 1,
                "notes": "Correcao de lote legado",
            },
            headers=self.headers,
        )
        self.assertEqual(
            negative_adjustment_response.status_code,
            201,
            negative_adjustment_response.text,
        )

    @patch(
        "app.services.stock_availability_policy.operational_today",
        return_value=TEST_OPERATIONAL_DATE,
    )
    def test_controlled_movements_require_notes_and_expiration_loss_requires_issue(
        self,
        _mocked_today,
    ):
        item = self.create_item(self.headers, tracks_expiration=False)
        usable_batch = self._create_batch_for_item(
            item_id=item["id"],
            entry_quantity=4,
            entry_date=TEST_OPERATIONAL_DATE,
            expiration_date=TEST_OPERATIONAL_DATE + timedelta(days=30),
            estimated_unit_value=1,
        )

        for movement_type, notes in (
            ("perda_validade", None),
            ("ajuste_negativo", ""),
            ("ajuste_positivo", "   "),
        ):
            with self.subTest(movement_type=movement_type):
                response = self.client.post(
                    "/stock-movements",
                    json={
                        "batch_id": usable_batch["id"],
                        "movement_type": movement_type,
                        "quantity": 1,
                        "notes": notes,
                    },
                    headers=self.headers,
                )
                self.assertEqual(response.status_code, 400, response.text)
                self.assertIn("exige uma justificativa", response.json()["detail"])

        invalid_expiration_loss_response = self.client.post(
            "/stock-movements",
            json={
                "batch_id": usable_batch["id"],
                "movement_type": "perda_validade",
                "quantity": 1,
                "notes": "Produto ainda dentro da validade",
            },
            headers=self.headers,
        )
        self.assertEqual(invalid_expiration_loss_response.status_code, 400)
        self.assertIn(
            "apenas para lote vencido",
            invalid_expiration_loss_response.json()["detail"],
        )

        batches_response = self.client.get("/stock-batches", headers=self.headers)
        self.assertEqual(batches_response.status_code, 200, batches_response.text)
        self.assertEqual(batches_response.json()[0]["current_quantity"], 4)

    def test_stock_batch_and_manual_movement_are_audited(self):
        batch = self.create_stock_batch(self.headers, entry_quantity=8)
        self.client.post(
            "/stock-movements",
            json={
                "batch_id": batch["id"],
                "movement_type": "saida_manual",
                "quantity": 2,
                "notes": "Teste de auditoria",
            },
            headers=self.headers,
        )

        response = self.client.get(
            "/audit-logs",
            headers=self.headers,
            params={"entity_type": "stock_movement"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertGreaterEqual(payload["total"], 1)
        self.assertEqual(payload["items"][0]["event_type"], "stock.movement.created")

    @patch(
        "app.services.stock_availability_policy.operational_today",
        return_value=TEST_OPERATIONAL_DATE,
    )
    def test_stock_batch_validates_expiration_rules(self, _mocked_today):
        today = TEST_OPERATIONAL_DATE
        item = self.create_item(self.headers, tracks_expiration=True)

        future_entry_response = self.client.post(
            "/stock-batches",
            json={
                "item_id": item["id"],
                "source_type": "doacao_item",
                "entry_quantity": 1,
                "entry_date": (today + timedelta(days=1)).isoformat(),
                "expiration_date": (today + timedelta(days=30)).isoformat(),
                "estimated_unit_value": 1,
                "notes": None,
            },
            headers=self.headers,
        )
        self.assertEqual(future_entry_response.status_code, 400)
        self.assertIn("nao pode estar no futuro", future_entry_response.json()["detail"])

        missing_expiration_response = self.client.post(
            "/stock-batches",
            json={
                "item_id": item["id"],
                "source_type": "doacao_item",
                "entry_quantity": 1,
                "entry_date": today.isoformat(),
                "expiration_date": None,
                "estimated_unit_value": 1,
                "notes": None,
            },
            headers=self.headers,
        )
        self.assertEqual(missing_expiration_response.status_code, 400)
        self.assertIn("exige data de validade", missing_expiration_response.json()["detail"])

        incoherent_dates_response = self.client.post(
            "/stock-batches",
            json={
                "item_id": item["id"],
                "source_type": "doacao_item",
                "entry_quantity": 1,
                "entry_date": today.isoformat(),
                "expiration_date": (today - timedelta(days=1)).isoformat(),
                "estimated_unit_value": 1,
                "notes": None,
            },
            headers=self.headers,
        )
        self.assertEqual(incoherent_dates_response.status_code, 400)
        self.assertIn(
            "nao pode ser anterior",
            incoherent_dates_response.json()["detail"],
        )

        expires_today_response = self.client.post(
            "/stock-batches",
            json={
                "item_id": item["id"],
                "source_type": "doacao_item",
                "entry_quantity": 1,
                "entry_date": today.isoformat(),
                "expiration_date": today.isoformat(),
                "estimated_unit_value": 1,
                "notes": None,
            },
            headers=self.headers,
        )
        self.assertEqual(expires_today_response.status_code, 201, expires_today_response.text)

    @patch(
        "app.services.stock_availability_policy.operational_today",
        return_value=TEST_OPERATIONAL_DATE,
    )
    def test_inactive_item_rejects_new_batch_and_does_not_generate_stock_alert(
        self,
        _mocked_today,
    ):
        item = self.create_item(
            self.headers,
            tracks_expiration=False,
            is_active=False,
            minimum_stock_alert=5,
        )

        batch_response = self.client.post(
            "/stock-batches",
            json={
                "item_id": item["id"],
                "source_type": "doacao_item",
                "entry_quantity": 2,
                "entry_date": TEST_OPERATIONAL_DATE.isoformat(),
                "expiration_date": None,
                "estimated_unit_value": 1,
                "notes": None,
            },
            headers=self.headers,
        )
        self.assertEqual(batch_response.status_code, 400, batch_response.text)
        self.assertIn("Itens inativos", batch_response.json()["detail"])

        summary_response = self.client.get("/stock-summary", headers=self.headers)
        self.assertEqual(summary_response.status_code, 200, summary_response.text)
        self.assertFalse(summary_response.json()[0]["is_active"])
        self.assertTrue(summary_response.json()[0]["is_below_minimum"])

        alerts_response = self.client.get("/stock-alerts", headers=self.headers)
        self.assertEqual(alerts_response.status_code, 200, alerts_response.text)
        self.assertEqual(alerts_response.json(), [])

    @patch(
        "app.services.stock_availability_policy.operational_today",
        return_value=TEST_OPERATIONAL_DATE,
    )
    def test_usable_stock_balance_is_consistent_across_all_summaries(
        self,
        _mocked_today,
    ):
        today = TEST_OPERATIONAL_DATE
        expired_date = today - timedelta(days=1)
        future_date = today + timedelta(days=30)
        item = self.create_item(
            self.headers,
            tracks_expiration=False,
            minimum_stock_alert=10,
        )

        expired_batch = self._create_batch_for_item(
            item_id=item["id"],
            entry_quantity=50,
            entry_date=expired_date - timedelta(days=1),
            expiration_date=expired_date,
            estimated_unit_value=100,
        )
        self._create_batch_for_item(
            item_id=item["id"],
            entry_quantity=2,
            entry_date=today,
            expiration_date=today,
            estimated_unit_value=2,
        )
        self._create_batch_for_item(
            item_id=item["id"],
            entry_quantity=3,
            entry_date=today,
            expiration_date=future_date,
            estimated_unit_value=3,
        )
        self._create_batch_for_item(
            item_id=item["id"],
            entry_quantity=4,
            entry_date=today,
            expiration_date=None,
            estimated_unit_value=4,
        )
        future_entry_batch = self._create_batch_for_item(
            item_id=item["id"],
            entry_quantity=7,
            entry_date=today,
            expiration_date=None,
            estimated_unit_value=5,
        )
        db = self.session_factory()
        try:
            persisted_future_entry_batch = db.get(
                StockBatch,
                future_entry_batch["id"],
            )
            persisted_future_entry_batch.entry_date = today + timedelta(days=1)
            db.commit()
        finally:
            db.close()

        basket_type = self.create_basket_type(self.headers)
        recipe_response = self.client.post(
            f"/basket-types/{basket_type['id']}/items",
            json={"item_id": item["id"], "required_quantity": 3},
            headers=self.headers,
        )
        self.assertEqual(recipe_response.status_code, 201, recipe_response.text)

        summary_response = self.client.get("/stock-summary", headers=self.headers)
        self.assertEqual(summary_response.status_code, 200, summary_response.text)
        summary = summary_response.json()[0]
        self.assertEqual(summary["total_quantity"], 9)
        self.assertEqual(summary["total_batches"], 5)
        self.assertTrue(summary["is_below_minimum"])

        alerts_response = self.client.get("/stock-alerts", headers=self.headers)
        self.assertEqual(alerts_response.status_code, 200, alerts_response.text)
        self.assertEqual(alerts_response.json()[0]["total_quantity"], 9)

        availability_response = self.client.get(
            f"/basket-types/{basket_type['id']}/availability",
            headers=self.headers,
        )
        self.assertEqual(availability_response.status_code, 200, availability_response.text)
        availability = availability_response.json()
        self.assertEqual(availability["possible_baskets"], 3)
        self.assertEqual(availability["items"][0]["available_quantity"], 9)

        dashboard_response = self.client.get("/dashboard/overview", headers=self.headers)
        self.assertEqual(dashboard_response.status_code, 200, dashboard_response.text)
        dashboard = dashboard_response.json()
        self.assertEqual(dashboard["basket_summaries"][0]["possible_baskets"], 3)
        self.assertEqual(dashboard["stock_alerts"][0]["total_quantity"], 9)

        financial_response = self.client.get("/financial-summary", headers=self.headers)
        self.assertEqual(financial_response.status_code, 200, financial_response.text)
        financial = financial_response.json()
        self.assertEqual(
            Decimal(str(financial["estimated_total_stock_value"])),
            Decimal("29.00"),
        )
        self.assertEqual(
            Decimal(str(financial["estimated_total_entries_value"])),
            Decimal("5064.00"),
        )
        self.assertEqual(
            Decimal(str(financial["categories"][0]["estimated_stock_value"])),
            Decimal("29.00"),
        )

        batches_response = self.client.get("/stock-batches", headers=self.headers)
        self.assertEqual(batches_response.status_code, 200, batches_response.text)
        persisted_batches = {
            batch["id"]: batch for batch in batches_response.json()
        }
        self.assertEqual(persisted_batches[expired_batch["id"]]["current_quantity"], 50)
