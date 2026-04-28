from integration_test_case import ApiIntegrationTestCase


class FamiliesApiIntegrationTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Admin Social",
            email="admin@example.com",
            password="Admin@12345",
            roles=("admin",),
        )
        self.create_user(
            name="Operador Estoque",
            email="operador@example.com",
            password="Operador@123",
            roles=("operador",),
        )
        self.headers = self.login_and_get_headers("admin@example.com", "Admin@12345")

    def test_create_family_and_prevent_duplicate_responsible_person(self):
        family = self.create_family(self.headers)

        first_person_response = self.client.post(
            f"/families/{family['id']}/people",
            json={
                "full_name": "Maria da Silva",
                "birth_date": "1988-05-10",
                "kinship": "responsavel",
                "gender": "feminino",
                "phone": "79999999999",
                "education_level": "medio",
                "is_currently_studying": False,
                "is_currently_working": True,
                "occupation": "Autonoma",
                "individual_income": 500,
                "has_disability": False,
                "has_chronic_illness": False,
                "is_pregnant": False,
                "is_nursing_mother": False,
                "notes": None,
                "is_family_responsible": True,
            },
            headers=self.headers,
        )

        self.assertEqual(first_person_response.status_code, 201, first_person_response.text)

        second_person_response = self.client.post(
            f"/families/{family['id']}/people",
            json={
                "full_name": "Jose da Silva",
                "birth_date": "1986-01-20",
                "kinship": "conjuge",
                "gender": "masculino",
                "phone": None,
                "education_level": None,
                "is_currently_studying": False,
                "is_currently_working": True,
                "occupation": "Pedreiro",
                "individual_income": 700,
                "has_disability": False,
                "has_chronic_illness": False,
                "is_pregnant": False,
                "is_nursing_mother": False,
                "notes": None,
                "is_family_responsible": True,
            },
            headers=self.headers,
        )

        self.assertEqual(second_person_response.status_code, 409, second_person_response.text)
        self.assertIn("responsavel", second_person_response.json()["detail"])

        family_detail_response = self.client.get(
            f"/families/{family['id']}",
            headers=self.headers,
        )
        self.assertEqual(family_detail_response.status_code, 200, family_detail_response.text)
        family_detail = family_detail_response.json()
        self.assertEqual(len(family_detail["people"]), 1)
        self.assertTrue(family_detail["people"][0]["is_family_responsible"])

    def test_operator_cannot_create_family(self):
        operator_headers = self.login_and_get_headers("operador@example.com", "Operador@123")
        response = self.client.post(
            "/families",
            json={
                "internal_code": "FAM-OPERADOR",
                "status": "em_analise",
                "registration_date": "2026-04-01",
                "last_evaluation_date": None,
                "next_revaluation_date": None,
                "monthly_income_total": 0,
                "monthly_essential_expenses": 0,
                "income_per_capita": 0,
                "receives_government_assistance": False,
                "attends_church": False,
                "church_name": None,
                "community_relationship": None,
                "responsible_education_level": None,
                "has_internet_access": False,
                "has_mobile_phone": True,
                "has_computer": False,
                "housing_type": "cedida",
                "has_water_supply": True,
                "has_electricity": True,
                "has_sanitation": True,
                "rooms_count": 2,
                "bedrooms_count": 1,
                "zip_code": "49000-000",
                "street": "Rua A",
                "number": "10",
                "complement": None,
                "neighborhood": "Centro",
                "city": "Aracaju",
                "state": "SE",
                "reference_point": None,
                "total_residents": 1,
                "total_adults": 1,
                "total_children": 0,
                "total_elderly": 0,
                "total_babies": 0,
                "has_pregnant_member": False,
                "has_disabled_member": False,
                "has_chronic_illness_member": False,
                "has_unemployed_member": False,
                "needs_extra_support": False,
                "social_notes": None,
                "internal_notes": None,
                "contacts": [],
            },
            headers=operator_headers,
        )

        self.assertEqual(response.status_code, 403, response.text)

    def test_family_creation_is_audited(self):
        family = self.create_family(self.headers, internal_code="FAM-AUDIT")

        response = self.client.get(
            "/audit-logs",
            headers=self.headers,
            params={"event_type": "family.created"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertGreaterEqual(payload["total"], 1)
        self.assertEqual(payload["items"][0]["entity_id"], str(family["id"]))
