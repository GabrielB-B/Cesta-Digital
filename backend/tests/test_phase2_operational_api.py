from integration_test_case import ApiIntegrationTestCase


class Phase2OperationalApiTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Admin Operacao",
            email="admin@example.com",
            password="Admin@12345",
            roles=("admin", "operador", "lider_social"),
        )
        self.headers = self.login_and_get_headers("admin", "Admin@12345")

    def test_family_status_update_and_paginated_list_headers(self):
        family = self.create_family(self.headers, internal_code="FAM-PHASE2")

        update_response = self.client.patch(
            f"/families/{family['id']}/status",
            json={
                "status": "inativa",
                "internal_notes": "Cadastro inativado no teste.",
            },
            headers=self.headers,
        )

        self.assertEqual(update_response.status_code, 200, update_response.text)
        self.assertEqual(update_response.json()["status"], "inativa")

        list_response = self.client.get(
            "/families",
            headers=self.headers,
            params={"status": "inativa", "limit": 1, "offset": 0},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        self.assertEqual(list_response.headers["x-total-count"], "1")
        self.assertEqual(list_response.json()[0]["internal_code"], "FAM-PHASE2")

    def test_family_full_registration_update_is_audited(self):
        family = self.create_family(
            self.headers,
            internal_code="FAM-EDIT",
            contacts=[
                {
                    "contact_name": "Maria",
                    "phone": "79999990000",
                    "contact_type": "principal",
                    "is_whatsapp": True,
                    "notes": None,
                }
            ],
        )

        payload = {
            "internal_code": "FAM-EDIT-UPDATED",
            "status": "apta_emergencial",
            "registration_date": family["registration_date"],
            "last_evaluation_date": None,
            "next_revaluation_date": "2026-06-01",
            "monthly_income_total": 500,
            "monthly_essential_expenses": 250,
            "income_per_capita": 250,
            "receives_government_assistance": True,
            "attends_church": True,
            "church_name": "UPG",
            "community_relationship": "participante",
            "responsible_education_level": "ensino_medio",
            "has_internet_access": True,
            "has_mobile_phone": True,
            "has_computer": False,
            "housing_type": "alugada",
            "has_water_supply": True,
            "has_electricity": True,
            "has_sanitation": True,
            "rooms_count": 3,
            "bedrooms_count": 2,
            "zip_code": "49010-000",
            "street": "Rua Atualizada",
            "number": "22",
            "complement": "Casa",
            "neighborhood": "Centro",
            "city": "Aracaju",
            "state": "SE",
            "reference_point": "Proximo a praca",
            "total_residents": 2,
            "total_adults": 1,
            "total_children": 1,
            "total_elderly": 0,
            "total_babies": 0,
            "has_pregnant_member": False,
            "has_disabled_member": False,
            "has_chronic_illness_member": False,
            "has_unemployed_member": True,
            "needs_extra_support": True,
            "social_notes": "Atualizacao social.",
            "internal_notes": "Atualizacao operacional.",
            "contacts": [
                {
                    "contact_name": "Maria Atualizada",
                    "phone": "79888880000",
                    "contact_type": "principal",
                    "is_whatsapp": True,
                    "notes": "Preferir WhatsApp.",
                }
            ],
        }

        update_response = self.client.put(
            f"/families/{family['id']}",
            json=payload,
            headers=self.headers,
        )

        self.assertEqual(update_response.status_code, 200, update_response.text)
        updated_family = update_response.json()
        self.assertEqual(updated_family["internal_code"], "FAM-EDIT-UPDATED")
        self.assertEqual(updated_family["status"], "apta_emergencial")
        self.assertEqual(updated_family["city"], "Aracaju")
        self.assertEqual(updated_family["contacts"][0]["phone"], "79888880000")

        audit_response = self.client.get(
            "/audit-logs",
            headers=self.headers,
            params={"event_type": "family.updated"},
        )
        self.assertEqual(audit_response.status_code, 200, audit_response.text)
        self.assertEqual(audit_response.json()["items"][0]["entity_id"], str(family["id"]))

    def test_item_category_item_and_basket_recipe_updates(self):
        category = self.create_item_category(self.headers)
        item_response = self.client.post(
            "/items",
            json={
                "category_id": category["id"],
                "name": "Arroz",
                "unit_measure": "kg",
                "tracks_expiration": False,
                "is_active": True,
                "reference_unit_value": 10,
                "minimum_stock_alert": 1,
                "notes": None,
            },
            headers=self.headers,
        )
        self.assertEqual(item_response.status_code, 201, item_response.text)
        item = item_response.json()
        basket_type = self.create_basket_type(self.headers)

        category_response = self.client.put(
            f"/item-categories/{category['id']}",
            json={
                "name": "alimentos secos",
                "description": "Itens secos",
                "is_active": False,
            },
            headers=self.headers,
        )
        self.assertEqual(category_response.status_code, 200, category_response.text)
        self.assertFalse(category_response.json()["is_active"])

        item_response = self.client.put(
            f"/items/{item['id']}",
            json={
                "category_id": category["id"],
                "name": "Arroz parboilizado",
                "unit_measure": "kg",
                "tracks_expiration": True,
                "is_active": False,
                "reference_unit_value": 12,
                "minimum_stock_alert": 3,
                "notes": "Atualizado",
            },
            headers=self.headers,
        )
        self.assertEqual(item_response.status_code, 200, item_response.text)
        self.assertFalse(item_response.json()["is_active"])

        recipe_response = self.client.post(
            f"/basket-types/{basket_type['id']}/items",
            json={"item_id": item["id"], "required_quantity": 2},
            headers=self.headers,
        )
        self.assertEqual(recipe_response.status_code, 201, recipe_response.text)

        audit_response = self.client.get("/audit-logs", headers=self.headers)
        self.assertEqual(audit_response.status_code, 200, audit_response.text)
        event_types = [item["event_type"] for item in audit_response.json()["items"]]
        self.assertIn("item_category.created", event_types)
        self.assertIn("item.created", event_types)
        self.assertIn("basket_type.created", event_types)
        self.assertIn("basket_type.recipe_item.created", event_types)

        recipe_update_response = self.client.put(
            f"/basket-types/{basket_type['id']}/items/{item['id']}",
            json={"required_quantity": 4},
            headers=self.headers,
        )
        self.assertEqual(
            recipe_update_response.status_code,
            200,
            recipe_update_response.text,
        )
        self.assertEqual(recipe_update_response.json()["required_quantity"], 4)

        recipe_delete_response = self.client.delete(
            f"/basket-types/{basket_type['id']}/items/{item['id']}",
            headers=self.headers,
        )
        self.assertEqual(recipe_delete_response.status_code, 204)

    def test_delivery_schedule_rejects_inactive_family_or_basket_type(self):
        inactive_family = self.create_family(
            self.headers,
            internal_code="FAM-INATIVA",
            status="inativa",
        )
        active_family = self.create_family(
            self.headers,
            internal_code="FAM-ATIVA",
            status="apta_recorrente",
        )
        active_basket_type = self.create_basket_type(
            self.headers,
            name="Cesta Ativa",
        )
        inactive_basket_type = self.create_basket_type(
            self.headers,
            name="Cesta Inativa",
            is_active=False,
        )

        inactive_family_response = self.client.post(
            "/delivery-schedules",
            json={
                "family_id": inactive_family["id"],
                "basket_type_id": active_basket_type["id"],
                "scheduled_date": "2026-04-20",
                "status": "agendado",
                "notes": None,
            },
            headers=self.headers,
        )
        self.assertEqual(inactive_family_response.status_code, 400)
        self.assertIn("inativas", inactive_family_response.json()["detail"])

        inactive_basket_response = self.client.post(
            "/delivery-schedules",
            json={
                "family_id": active_family["id"],
                "basket_type_id": inactive_basket_type["id"],
                "scheduled_date": "2026-04-20",
                "status": "agendado",
                "notes": None,
            },
            headers=self.headers,
        )
        self.assertEqual(inactive_basket_response.status_code, 400)
        self.assertIn("inativos", inactive_basket_response.json()["detail"])

    def test_delivery_schedule_update_and_audit_export(self):
        family = self.create_family(self.headers, internal_code="FAM-SCHEDULE")
        basket_type = self.create_basket_type(self.headers, name="Cesta Agenda")

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
        self.assertEqual(schedule_response.status_code, 201, schedule_response.text)
        schedule = schedule_response.json()

        update_response = self.client.put(
            f"/delivery-schedules/{schedule['id']}",
            json={
                "scheduled_date": "2026-04-22",
                "status": "reagendado",
                "notes": "Nova data combinada.",
            },
            headers=self.headers,
        )
        self.assertEqual(update_response.status_code, 200, update_response.text)
        self.assertEqual(update_response.json()["status"], "reagendado")

        export_response = self.client.get("/audit-logs/export", headers=self.headers)
        self.assertEqual(export_response.status_code, 200, export_response.text)
        self.assertIn("text/csv", export_response.headers["content-type"])
        self.assertIn("delivery.schedule.updated", export_response.text)
