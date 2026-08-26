from integration_test_case import ApiIntegrationTestCase


class ReportsApiTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Admin Relatórios",
            email="admin.reports@example.com",
            password="Admin@12345",
            login_name="admin_reports",
            roles=("admin", "lider_social", "operador"),
        )
        self.create_user(
            name="Liderança Relatórios",
            email="social.reports@example.com",
            password="Social@12345",
            login_name="social_reports",
            roles=("lider_social",),
        )
        self.create_user(
            name="Operação Relatórios",
            email="operacao.reports@example.com",
            password="Operacao@12345",
            login_name="operacao_reports",
            roles=("operador",),
        )
        self.admin_headers = self.login_and_get_headers(
            "admin_reports", "Admin@12345"
        )
        self.social_headers = self.login_and_get_headers(
            "social_reports", "Social@12345"
        )
        self.operation_headers = self.login_and_get_headers(
            "operacao_reports", "Operacao@12345"
        )
        self._seed_report_data()

    def _seed_report_data(self) -> None:
        family = self.create_family(
            self.admin_headers,
            internal_code="FAM-REPORT-001",
            registration_date="2026-04-01",
        )
        item = self.create_item(
            self.admin_headers,
            name="Arroz relatório",
            tracks_expiration=False,
        )
        batch_response = self.client.post(
            "/stock-batches",
            headers=self.admin_headers,
            json={
                "item_id": item["id"],
                "source_type": "doacao_item",
                "entry_quantity": 10,
                "entry_date": "2026-04-10",
                "expiration_date": None,
                "estimated_unit_value": 8,
                "notes": None,
            },
        )
        self.assertEqual(batch_response.status_code, 201, batch_response.text)

        basket = self.create_basket_type(
            self.admin_headers,
            name="Cesta Relatório",
        )
        recipe_response = self.client.post(
            f"/basket-types/{basket['id']}/items",
            headers=self.admin_headers,
            json={"item_id": item["id"], "required_quantity": 2},
        )
        self.assertEqual(recipe_response.status_code, 201, recipe_response.text)

        schedule_response = self.client.post(
            "/delivery-schedules",
            headers=self.admin_headers,
            json={
                "family_id": family["id"],
                "basket_type_id": basket["id"],
                "scheduled_date": "2026-04-15",
                "status": "agendado",
                "notes": None,
            },
        )
        self.assertEqual(schedule_response.status_code, 201, schedule_response.text)
        delivery_response = self.client.post(
            f"/deliveries/from-schedule/{schedule_response.json()['id']}",
            headers=self.admin_headers,
            json={
                "delivery_date": "2026-04-15T10:30:00",
                "status": "concluida",
                "notes": None,
            },
        )
        self.assertEqual(delivery_response.status_code, 201, delivery_response.text)

        benefit_response = self.client.post(
            f"/families/{family['id']}/benefits",
            headers=self.admin_headers,
            json={
                "person_id": None,
                "benefit_type": "Auxílio teste",
                "monthly_amount": 250,
                "counts_as_income": True,
                "is_active": True,
                "start_date": "2026-04-05",
                "end_date": None,
                "notes": None,
            },
        )
        self.assertEqual(benefit_response.status_code, 201, benefit_response.text)

    def test_overview_calculates_period_kpis_and_admin_reports(self):
        response = self.client.get(
            "/reports/overview",
            headers=self.admin_headers,
            params={"start_date": "2026-04-01", "end_date": "2026-04-30"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["kpis"]["families_served"], 1)
        self.assertEqual(payload["kpis"]["baskets_delivered"], 1)
        self.assertEqual(payload["kpis"]["items_distributed"], 2)
        self.assertEqual(len(payload["available_reports"]), 6)
        self.assertEqual(payload["start_date"], "2026-04-01")
        self.assertEqual(payload["end_date"], "2026-04-30")

    def test_reports_and_exports_follow_role_boundaries(self):
        operation_response = self.client.get(
            "/reports/overview",
            headers=self.operation_headers,
            params={"start_date": "2026-04-01", "end_date": "2026-04-30"},
        )
        self.assertEqual(operation_response.status_code, 200, operation_response.text)
        operation_keys = {
            report["key"]
            for report in operation_response.json()["available_reports"]
        }
        self.assertEqual(
            operation_keys,
            {"deliveries", "stock_movements", "stock_alerts"},
        )

        forbidden = self.client.get(
            "/reports/benefits/export",
            headers=self.operation_headers,
            params={"start_date": "2026-04-01", "end_date": "2026-04-30"},
        )
        self.assertEqual(forbidden.status_code, 403, forbidden.text)

        export = self.client.get(
            "/reports/deliveries/export",
            headers=self.operation_headers,
            params={"start_date": "2026-04-01", "end_date": "2026-04-30"},
        )
        self.assertEqual(export.status_code, 200, export.text)
        self.assertIn("text/csv", export.headers["content-type"])
        self.assertIn("deliveries-2026-04-01-2026-04-30.csv", export.headers["content-disposition"])
        self.assertIn("codigo_familia", export.text)
        self.assertIn("FAM-REPORT-001", export.text)

        audit_response = self.client.get(
            "/audit-logs",
            headers=self.admin_headers,
            params={"event_type": "report.exported"},
        )
        self.assertEqual(audit_response.status_code, 200, audit_response.text)
        audit_items = audit_response.json()["items"]
        self.assertEqual(len(audit_items), 1)
        self.assertEqual(audit_items[0]["entity_id"], "deliveries")
        self.assertEqual(audit_items[0]["details"]["row_count"], 1)

        social_response = self.client.get(
            "/reports/overview",
            headers=self.social_headers,
            params={"start_date": "2026-04-01", "end_date": "2026-04-30"},
        )
        social_keys = {
            report["key"]
            for report in social_response.json()["available_reports"]
        }
        self.assertEqual(social_keys, {"attendances", "benefits", "families"})

    def test_period_validation_rejects_inverted_or_excessive_ranges(self):
        inverted = self.client.get(
            "/reports/overview",
            headers=self.admin_headers,
            params={"start_date": "2026-05-01", "end_date": "2026-04-01"},
        )
        self.assertEqual(inverted.status_code, 422, inverted.text)

        excessive = self.client.get(
            "/reports/overview",
            headers=self.admin_headers,
            params={"start_date": "2024-01-01", "end_date": "2026-04-01"},
        )
        self.assertEqual(excessive.status_code, 422, excessive.text)
