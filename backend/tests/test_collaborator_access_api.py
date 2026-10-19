from datetime import date

from integration_test_case import ApiIntegrationTestCase
from app.models.family import Family


class CollaboratorAccessApiIntegrationTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Administrador de teste",
            email="admin@example.com",
            password="Admin@12345",
            roles=("admin",),
        )
        self.create_user(
            name="Colaborador API",
            email="colaborador@example.com",
            password="Colaborador@123",
            roles=("colaborador",),
        )
        self.admin_headers = self.login_and_get_headers("admin", "Admin@12345")
        self.headers = self.login_and_get_headers("colaborador", "Colaborador@123")

    def test_collaborator_can_access_only_daily_operation_collections(self):
        for path in (
            "/dashboard/overview",
            "/operational/families",
            "/operational/basket-types",
            "/items",
            "/stock-batches",
            "/stock-movements",
            "/stock-summary",
            "/deliveries",
            "/delivery-schedules",
        ):
            with self.subTest(path=path):
                response = self.client.get(path, headers=self.headers)
                self.assertEqual(response.status_code, 200, f"{path}: {response.text}")

    def test_collaborator_cannot_access_social_catalog_configuration_or_administration(self):
        for path in (
            "/families",
            "/social-assessments/queue",
            "/item-categories",
            "/basket-types",
            "/reports/overview",
            "/financial-summary",
            "/users",
            "/users/roles",
            "/audit-logs",
        ):
            with self.subTest(path=path):
                response = self.client.get(path, headers=self.headers)
                self.assertEqual(response.status_code, 403, f"{path}: {response.text}")

    def test_operational_family_projection_omits_sensitive_fields(self):
        family = self.create_family(
            self.admin_headers,
            internal_code="FAM-PRIVADA",
            monthly_income_total=900,
            income_per_capita=300,
            social_notes="Dado social protegido",
            internal_notes="Observação interna protegida",
            contacts=[
                {
                    "contact_name": "Contato sigiloso",
                    "phone": "79999999999",
                    "contact_type": "principal",
                    "is_whatsapp": True,
                    "notes": None,
                }
            ],
        )

        response = self.client.get("/operational/families", headers=self.headers)

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.headers["x-total-count"], "1")
        payload = response.json()[0]
        self.assertEqual(payload["id"], family["id"])
        self.assertEqual(
            set(payload),
            {
                "id",
                "display_name",
                "status",
                "total_residents",
                "neighborhood",
                "city",
                "state",
                "eligible_for_delivery",
            },
        )
        self.assertNotIn("internal_code", payload)
        self.assertNotIn("contacts", payload)
        self.assertNotIn("monthly_income_total", payload)
        self.assertNotIn("social_notes", payload)

        detail = self.client.get(f"/families/{family['id']}", headers=self.headers)
        update = self.client.put(
            f"/families/{family['id']}",
            headers=self.headers,
            json=self.family_payload(internal_code="FAM-ALTERADA"),
        )
        self.assertEqual(detail.status_code, 403, detail.text)
        self.assertEqual(update.status_code, 403, update.text)

    def test_operational_delivery_options_return_only_eligible_families_and_active_baskets(self):
        eligible_family = self.create_family(
            self.admin_headers,
            internal_code="FAM-APTA",
        )
        self.create_family(
            self.admin_headers,
            internal_code="FAM-ANALISE",
            neighborhood="Outro bairro",
        )
        active_basket = self.create_basket_type(self.admin_headers, name="Cesta ativa")
        self.create_basket_type(
            self.admin_headers,
            name="Cesta inativa",
            is_active=False,
        )
        with self.session_factory() as db:
            stored_family = db.get(Family, eligible_family["id"])
            stored_family.status = "apta_recorrente"
            db.commit()

        families = self.client.get(
            "/operational/families",
            headers=self.headers,
            params={"eligible_only": True},
        )
        baskets = self.client.get("/operational/basket-types", headers=self.headers)

        self.assertEqual(families.status_code, 200, families.text)
        self.assertEqual([item["id"] for item in families.json()], [eligible_family["id"]])
        self.assertTrue(families.json()[0]["eligible_for_delivery"])
        self.assertEqual(baskets.status_code, 200, baskets.text)
        self.assertEqual(baskets.json(), [{"id": active_basket["id"], "name": "Cesta ativa"}])

    def test_collaborator_cannot_create_or_edit_catalog_and_batch_metadata(self):
        item = self.create_item(self.admin_headers)

        create_item = self.client.post(
            "/items",
            headers=self.headers,
            json={
                "category_id": item["category_id"],
                "name": "Produto indevido",
                "unit_measure": "unidade",
                "tracks_expiration": False,
                "is_active": True,
                "reference_unit_value": 1,
                "minimum_stock_alert": 1,
                "notes": None,
            },
        )
        batch = self.client.post(
            "/stock-batches",
            headers=self.headers,
            json={
                "item_id": item["id"],
                "source_type": "doacao_item",
                "status": "disponivel",
                "entry_quantity": 10,
                "entry_date": date.today().isoformat(),
                "expiration_date": None,
                "estimated_unit_value": 1,
                "notes": None,
            },
        )
        self.assertEqual(create_item.status_code, 403, create_item.text)
        self.assertEqual(batch.status_code, 201, batch.text)

        adjustment_entry = self.client.post(
            "/stock-batches",
            headers=self.headers,
            json={
                "item_id": item["id"],
                "source_type": "ajuste",
                "entry_quantity": 2,
                "entry_date": date.today().isoformat(),
                "expiration_date": None,
                "estimated_unit_value": 1,
                "notes": "Tentativa de ajuste",
            },
        )
        self.assertEqual(adjustment_entry.status_code, 403, adjustment_entry.text)

        metadata_update = self.client.patch(
            f"/stock-batches/{batch.json()['id']}/metadata",
            headers=self.headers,
            json={"status": "bloqueado"},
        )
        self.assertEqual(metadata_update.status_code, 403, metadata_update.text)

    def test_collaborator_can_register_manual_output_but_not_control_adjustments(self):
        item = self.create_item(self.admin_headers)
        batch = self.client.post(
            "/stock-batches",
            headers=self.headers,
            json={
                "item_id": item["id"],
                "source_type": "doacao_item",
                "entry_quantity": 10,
                "entry_date": date.today().isoformat(),
                "expiration_date": None,
                "estimated_unit_value": 1,
                "notes": None,
            },
        ).json()

        manual_output = self.client.post(
            "/stock-movements",
            headers=self.headers,
            json={
                "batch_id": batch["id"],
                "movement_type": "saida_manual",
                "quantity": 1,
                "notes": "Saída operacional",
            },
        )
        self.assertEqual(manual_output.status_code, 201, manual_output.text)

        for movement_type in ("perda_validade", "ajuste_negativo", "ajuste_positivo"):
            with self.subTest(movement_type=movement_type):
                response = self.client.post(
                    "/stock-movements",
                    headers=self.headers,
                    json={
                        "batch_id": batch["id"],
                        "movement_type": movement_type,
                        "quantity": 1,
                        "notes": "Tentativa sem permissão",
                    },
                )
                self.assertEqual(response.status_code, 403, response.text)

    def test_collaborator_cannot_create_family_people_or_benefits(self):
        family = self.create_family(self.admin_headers)

        create_family = self.client.post(
            "/families",
            headers=self.headers,
            json=self.family_payload(internal_code="FAM-INDEVIDA"),
        )
        people = self.client.get(
            f"/families/{family['id']}/people",
            headers=self.headers,
        )
        benefits = self.client.get(
            f"/families/{family['id']}/benefits",
            headers=self.headers,
        )

        self.assertEqual(create_family.status_code, 403, create_family.text)
        self.assertEqual(people.status_code, 403, people.text)
        self.assertEqual(benefits.status_code, 403, benefits.text)
