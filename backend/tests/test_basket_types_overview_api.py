from integration_test_case import ApiIntegrationTestCase


class BasketTypesOverviewApiTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Operador de Cestas",
            email="cestas@example.com",
            password="Cestas@12345",
            roles=("operador",),
            login_name="cestas",
        )
        self.create_user(
            name="Liderança Social",
            email="social-cestas@example.com",
            password="Social@12345",
            roles=("lider_social",),
            login_name="social-cestas",
        )
        self.operator_headers = self.login_and_get_headers(
            "cestas", "Cestas@12345"
        )
        self.social_headers = self.login_and_get_headers(
            "social-cestas", "Social@12345"
        )
        self.category = self.create_item_category(
            self.operator_headers,
            name="Alimentos para cestas",
        )

    def _create_item(
        self,
        *,
        name: str,
        value: int,
        tracks_expiration: bool = True,
    ) -> dict:
        response = self.client.post(
            "/items",
            headers=self.operator_headers,
            json={
                "category_id": self.category["id"],
                "name": name,
                "unit_measure": "unidade",
                "tracks_expiration": tracks_expiration,
                "is_active": True,
                "reference_unit_value": value,
                "minimum_stock_alert": 1,
                "notes": None,
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_overview_calculates_recipe_count_and_reference_value(self):
        basket = self.create_basket_type(
            self.operator_headers,
            name="Cesta Essencial",
            notes="Composição mensal",
        )
        rice = self._create_item(name="Arroz 5kg", value=30)
        milk = self._create_item(name="Leite 1L", value=6)

        for item_id, quantity in ((rice["id"], 2), (milk["id"], 3)):
            response = self.client.post(
                f"/basket-types/{basket['id']}/items",
                headers=self.operator_headers,
                json={"item_id": item_id, "required_quantity": quantity},
            )
            self.assertEqual(response.status_code, 201, response.text)

        overview_response = self.client.get(
            "/basket-types/overview",
            headers=self.operator_headers,
            params={"limit": 1},
        )
        self.assertEqual(overview_response.status_code, 200, overview_response.text)
        self.assertEqual(overview_response.headers["x-total-count"], "1")
        overview = overview_response.json()[0]
        self.assertEqual(overview["name"], "Cesta Essencial")
        self.assertEqual(overview["item_count"], 2)
        self.assertEqual(overview["estimated_value"], "78.00")
        self.assertTrue(overview["updated_at"])

        detail_response = self.client.get(
            f"/basket-types/{basket['id']}",
            headers=self.operator_headers,
        )
        self.assertEqual(detail_response.status_code, 200, detail_response.text)
        recipe = {item["item_name"]: item for item in detail_response.json()["basket_items"]}
        self.assertEqual(recipe["Arroz 5kg"]["category_name"], "Alimentos para cestas")
        self.assertEqual(recipe["Arroz 5kg"]["reference_unit_value"], "30.00")
        self.assertTrue(recipe["Arroz 5kg"]["tracks_expiration"])
        self.assertIsNone(recipe["Arroz 5kg"]["image_path"])

    def test_overview_filters_paginates_and_preserves_rbac(self):
        self.create_basket_type(
            self.operator_headers,
            name="Cesta Ativa",
            is_active=True,
        )
        self.create_basket_type(
            self.operator_headers,
            name="Cesta Arquivada",
            is_active=False,
        )

        active_response = self.client.get(
            "/basket-types/overview",
            headers=self.operator_headers,
            params={"q": "Ativa", "is_active": True, "limit": 1},
        )
        self.assertEqual(active_response.status_code, 200, active_response.text)
        self.assertEqual(active_response.headers["x-total-count"], "1")
        self.assertEqual(active_response.json()[0]["name"], "Cesta Ativa")

        forbidden_response = self.client.get(
            "/basket-types/overview",
            headers=self.social_headers,
        )
        self.assertEqual(forbidden_response.status_code, 403)

        self.client.cookies.clear()
        anonymous_response = self.client.get("/basket-types/overview")
        self.assertEqual(anonymous_response.status_code, 401)
