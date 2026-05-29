from integration_test_case import ApiIntegrationTestCase


class AuthApiIntegrationTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Admin API",
            email="admin@example.com",
            password="Admin@12345",
            roles=("admin",),
        )

    def test_root_and_login_return_security_headers_and_current_user(self):
        health_response = self.client.get("/")
        self.assertEqual(health_response.status_code, 200, health_response.text)
        self.assertTrue(health_response.headers.get("X-Request-ID"))
        self.assertEqual(health_response.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(health_response.headers.get("X-Frame-Options"), "DENY")

        login_response = self.client.post(
            "/auth/login",
            data={
                "username": "admin",
                "password": "Admin@12345",
                "grant_type": "password",
            },
        )

        self.assertEqual(login_response.status_code, 200, login_response.text)
        body = login_response.json()
        self.assertIn("access_token", body)
        self.assertEqual(body["login_name"], "admin")
        self.assertEqual(body["email"], "admin@example.com")
        self.assertEqual(body["roles"], ["admin"])
        self.assertTrue(login_response.headers.get("X-Request-ID"))
        self.assertIn("cesta_digital_session", login_response.cookies)

        me_response = self.client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {body['access_token']}"},
        )

        self.assertEqual(me_response.status_code, 200, me_response.text)
        me_body = me_response.json()
        self.assertEqual(me_body["login_name"], "admin")
        self.assertEqual(me_body["email"], "admin@example.com")
        self.assertTrue(me_body["is_active"])
        self.assertEqual(me_body["roles"], ["admin"])

        cookie_me_response = self.client.get("/auth/me")
        self.assertEqual(cookie_me_response.status_code, 200, cookie_me_response.text)
        self.assertEqual(cookie_me_response.json()["email"], "admin@example.com")

        logout_response = self.client.post("/auth/logout")
        self.assertEqual(logout_response.status_code, 204, logout_response.text)

    def test_login_rejects_invalid_password_and_blocks_after_limit(self):
        for attempt in range(1, 5):
            response = self.client.post(
                "/auth/login",
                data={
                    "username": "admin",
                    "password": "senha-errada",
                    "grant_type": "password",
                },
            )
            self.assertEqual(response.status_code, 401, f"attempt {attempt}: {response.text}")

        locked_response = self.client.post(
            "/auth/login",
            data={
                "username": "admin",
                "password": "senha-errada",
                "grant_type": "password",
            },
        )

        self.assertEqual(locked_response.status_code, 429, locked_response.text)
        self.assertTrue(locked_response.headers.get("Retry-After"))
        self.assertIn("Muitas tentativas", locked_response.json()["detail"])

    def test_login_success_and_failure_are_audited(self):
        self.client.post(
            "/auth/login",
            data={
                "username": "admin",
                "password": "senha-errada",
                "grant_type": "password",
            },
        )
        headers = self.login_and_get_headers("admin", "Admin@12345")

        audit_response = self.client.get(
            "/audit-logs",
            headers=headers,
            params={"actor_email": "admin@example.com"},
        )
        self.assertEqual(audit_response.status_code, 200, audit_response.text)
        payload = audit_response.json()
        event_types = [item["event_type"] for item in payload["items"]]
        self.assertIn("auth.login_failed", event_types)
        self.assertIn("auth.login_succeeded", event_types)
