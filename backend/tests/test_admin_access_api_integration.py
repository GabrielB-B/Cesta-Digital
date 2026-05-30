from integration_test_case import ApiIntegrationTestCase


class AdminAccessApiIntegrationTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Admin API",
            email="admin@example.com",
            password="Admin@12345",
            roles=("admin",),
        )
        self.create_user(
            name="Operador API",
            email="operador@example.com",
            password="Operador@123",
            roles=("operador",),
        )
        self.create_user(
            name="Lideranca API",
            email="lider@example.com",
            password="Lider@12345",
            roles=("lider_social",),
        )

    def test_admin_can_access_user_and_audit_administration(self):
        headers = self.login_and_get_headers("admin", "Admin@12345")

        users_response = self.client.get("/users", headers=headers)
        self.assertEqual(users_response.status_code, 200, users_response.text)

        roles_response = self.client.get("/users/roles", headers=headers)
        self.assertEqual(roles_response.status_code, 200, roles_response.text)

        audit_response = self.client.get("/audit-logs", headers=headers)
        self.assertEqual(audit_response.status_code, 200, audit_response.text)

        export_response = self.client.get("/audit-logs/export", headers=headers)
        self.assertEqual(export_response.status_code, 200, export_response.text)

    def test_non_admin_roles_cannot_access_user_or_audit_administration(self):
        for login_name, password in (
            ("operador", "Operador@123"),
            ("lider", "Lider@12345"),
        ):
            with self.subTest(login_name=login_name):
                headers = self.login_and_get_headers(login_name, password)

                for path in ("/users", "/users/roles", "/audit-logs", "/audit-logs/export"):
                    response = self.client.get(path, headers=headers)
                    self.assertEqual(response.status_code, 403, f"{path}: {response.text}")
