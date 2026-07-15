from datetime import date, timedelta
from unittest.mock import patch

from integration_test_case import ApiIntegrationTestCase


TEST_OPERATIONAL_DATE = date(2026, 7, 14)


class DeliveriesApiIntegrationTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Admin Operacao",
            email="admin@example.com",
            password="Admin@12345",
            roles=("admin", "operador", "lider_social"),
        )
        self.headers = self.login_and_get_headers("admin", "Admin@12345")

    def _create_batch_for_item(
        self,
        *,
        item_id: int,
        entry_quantity: int,
        entry_date,
        expiration_date,
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
                "estimated_unit_value": 1,
                "notes": None,
            },
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_delivery_confirmation_consumes_stock_and_updates_schedule(self):
        family = self.create_family(self.headers)
        item = self.create_item(self.headers)
        batch_response = self.client.post(
            "/stock-batches",
            json={
                "item_id": item["id"],
                "source_type": "doacao_item",
                "entry_quantity": 5,
                "entry_date": "2026-04-10",
                "expiration_date": None,
                "estimated_unit_value": 8,
                "notes": None,
            },
            headers=self.headers,
        )
        self.assertEqual(batch_response.status_code, 201, batch_response.text)

        basket_type = self.create_basket_type(self.headers)
        recipe_response = self.client.post(
            f"/basket-types/{basket_type['id']}/items",
            json={
                "item_id": item["id"],
                "required_quantity": 2,
            },
            headers=self.headers,
        )
        self.assertEqual(recipe_response.status_code, 201, recipe_response.text)

        schedule_response = self.client.post(
            "/delivery-schedules",
            json={
                "family_id": family["id"],
                "basket_type_id": basket_type["id"],
                "scheduled_date": "2026-04-15",
                "status": "agendado",
                "notes": "Retirada da semana",
            },
            headers=self.headers,
        )
        self.assertEqual(schedule_response.status_code, 201, schedule_response.text)
        schedule = schedule_response.json()

        delivery_response = self.client.post(
            f"/deliveries/from-schedule/{schedule['id']}",
            json={
                "delivery_date": "2026-04-15T10:30:00",
                "status": "concluida",
                "notes": "Entrega concluida com sucesso",
            },
            headers=self.headers,
        )
        self.assertEqual(delivery_response.status_code, 201, delivery_response.text)

        batches_response = self.client.get("/stock-batches", headers=self.headers)
        self.assertEqual(batches_response.status_code, 200, batches_response.text)
        self.assertEqual(batches_response.json()[0]["current_quantity"], 3)

        schedules_response = self.client.get("/delivery-schedules", headers=self.headers)
        self.assertEqual(schedules_response.status_code, 200, schedules_response.text)
        self.assertEqual(schedules_response.json()[0]["status"], "retirado")

        deliveries_response = self.client.get(
            "/deliveries",
            headers=self.headers,
            params={"family_id": family["id"], "limit": 1, "offset": 0},
        )
        self.assertEqual(deliveries_response.status_code, 200, deliveries_response.text)
        self.assertEqual(deliveries_response.headers["x-total-count"], "1")
        persisted_delivery = deliveries_response.json()[0]
        self.assertEqual(persisted_delivery["family_id"], family["id"])
        self.assertEqual(len(persisted_delivery["items"]), 1)
        self.assertEqual(
            persisted_delivery["items"][0]["batch_id"],
            batch_response.json()["id"],
        )
        self.assertEqual(persisted_delivery["items"][0]["item_name"], item["name"])
        self.assertEqual(persisted_delivery["items"][0]["quantity"], 2)
        self.assertTrue(persisted_delivery["items"][0]["batch_code"])

        detail_response = self.client.get(
            f"/deliveries/{persisted_delivery['id']}",
            headers=self.headers,
        )
        self.assertEqual(detail_response.status_code, 200, detail_response.text)
        self.assertEqual(detail_response.json()["items"], persisted_delivery["items"])

        movements_response = self.client.get("/stock-movements", headers=self.headers)
        self.assertEqual(movements_response.status_code, 200, movements_response.text)
        self.assertEqual(movements_response.json()[0]["movement_type"], "saida_entrega")
        self.assertEqual(movements_response.json()[0]["quantity"], 2)

    def test_delivery_schedule_and_confirmation_are_audited(self):
        family = self.create_family(self.headers, internal_code="FAM-DELIVERY-AUDIT")
        item = self.create_item(self.headers, name="Feijao")
        self.client.post(
            "/stock-batches",
            json={
                "item_id": item["id"],
                "source_type": "doacao_item",
                "entry_quantity": 4,
                "entry_date": "2026-04-11",
                "expiration_date": None,
                "estimated_unit_value": 7,
                "notes": None,
            },
            headers=self.headers,
        )
        basket_type = self.create_basket_type(self.headers, name="Cesta Auditoria")
        self.client.post(
            f"/basket-types/{basket_type['id']}/items",
            json={"item_id": item["id"], "required_quantity": 1},
            headers=self.headers,
        )
        schedule_response = self.client.post(
            "/delivery-schedules",
            json={
                "family_id": family["id"],
                "basket_type_id": basket_type["id"],
                "scheduled_date": "2026-04-20",
                "status": "agendado",
                "notes": None,
            },
            headers=self.headers,
        )
        schedule = schedule_response.json()
        self.client.post(
            f"/deliveries/from-schedule/{schedule['id']}",
            json={
                "delivery_date": "2026-04-20T09:00:00",
                "status": "concluida",
                "notes": None,
            },
            headers=self.headers,
        )

        audit_response = self.client.get("/audit-logs", headers=self.headers)
        self.assertEqual(audit_response.status_code, 200, audit_response.text)
        event_types = [item["event_type"] for item in audit_response.json()["items"]]
        self.assertIn("delivery.schedule.created", event_types)
        self.assertIn("delivery.created", event_types)

    @patch(
        "app.services.stock_availability_policy.operational_today",
        return_value=TEST_OPERATIONAL_DATE,
    )
    def test_delivery_uses_only_usable_batches_in_fefo_order(self, _mocked_today):
        today = TEST_OPERATIONAL_DATE
        expired_date = today - timedelta(days=1)
        future_date = today + timedelta(days=20)
        family = self.create_family(
            self.headers,
            internal_code="FAM-FEFO",
        )
        item = self.create_item(self.headers, tracks_expiration=False)

        expired_batch = self._create_batch_for_item(
            item_id=item["id"],
            entry_quantity=10,
            entry_date=expired_date - timedelta(days=1),
            expiration_date=expired_date,
        )
        expires_today_batch = self._create_batch_for_item(
            item_id=item["id"],
            entry_quantity=2,
            entry_date=today,
            expiration_date=today,
        )
        future_batch = self._create_batch_for_item(
            item_id=item["id"],
            entry_quantity=3,
            entry_date=today,
            expiration_date=future_date,
        )
        no_expiration_batch = self._create_batch_for_item(
            item_id=item["id"],
            entry_quantity=4,
            entry_date=today,
            expiration_date=None,
        )

        basket_type = self.create_basket_type(self.headers, name="Cesta FEFO")
        recipe_response = self.client.post(
            f"/basket-types/{basket_type['id']}/items",
            json={"item_id": item["id"], "required_quantity": 6},
            headers=self.headers,
        )
        self.assertEqual(recipe_response.status_code, 201, recipe_response.text)

        schedule_response = self.client.post(
            "/delivery-schedules",
            json={
                "family_id": family["id"],
                "basket_type_id": basket_type["id"],
                "scheduled_date": today.isoformat(),
                "status": "agendado",
                "notes": "Validacao FEFO",
            },
            headers=self.headers,
        )
        self.assertEqual(schedule_response.status_code, 201, schedule_response.text)

        delivery_response = self.client.post(
            f"/deliveries/from-schedule/{schedule_response.json()['id']}",
            json={
                "delivery_date": f"{today.isoformat()}T10:00:00",
                "status": "concluida",
                "notes": None,
            },
            headers=self.headers,
        )
        self.assertEqual(delivery_response.status_code, 201, delivery_response.text)

        batches_response = self.client.get("/stock-batches", headers=self.headers)
        self.assertEqual(batches_response.status_code, 200, batches_response.text)
        persisted_batches = {
            batch["id"]: batch for batch in batches_response.json()
        }
        self.assertEqual(persisted_batches[expired_batch["id"]]["current_quantity"], 10)
        self.assertEqual(
            persisted_batches[expires_today_batch["id"]]["current_quantity"],
            0,
        )
        self.assertEqual(persisted_batches[future_batch["id"]]["current_quantity"], 0)
        self.assertEqual(
            persisted_batches[no_expiration_batch["id"]]["current_quantity"],
            3,
        )

        movements_response = self.client.get("/stock-movements", headers=self.headers)
        self.assertEqual(movements_response.status_code, 200, movements_response.text)
        consumed_batch_ids = {
            movement["batch_id"] for movement in movements_response.json()
        }
        self.assertNotIn(expired_batch["id"], consumed_batch_ids)
        self.assertEqual(
            consumed_batch_ids,
            {
                expires_today_batch["id"],
                future_batch["id"],
                no_expiration_batch["id"],
            },
        )

        deliveries_response = self.client.get("/deliveries", headers=self.headers)
        self.assertEqual(deliveries_response.status_code, 200, deliveries_response.text)
        traced_batch_ids = {
            item["batch_id"]
            for item in deliveries_response.json()[0]["items"]
        }
        self.assertEqual(traced_batch_ids, consumed_batch_ids)
