from integration_test_case import ApiIntegrationTestCase


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
