from integration_test_case import ApiIntegrationTestCase


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
        self.assertEqual(deliveries_response.json()[0]["family_id"], family["id"])

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
