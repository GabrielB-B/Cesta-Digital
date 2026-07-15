import os
import unittest

from pydantic import ValidationError

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DB_HOST", "127.0.0.1")
os.environ.setdefault("DB_NAME", "cesta_test")
os.environ.setdefault("DB_USER", "cesta_test")
os.environ.setdefault("DB_PASSWORD", "cesta_test")
os.environ.setdefault("FIRST_ADMIN_NAME", "Administrador")
os.environ.setdefault("FIRST_ADMIN_EMAIL", "admin@example.invalid")
os.environ.setdefault("FIRST_ADMIN_PASSWORD", "SenhaUnica@123")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

from app.core.config import Settings


def build_settings(**overrides):
    values = {
        "app_env": "staging",
        "db_host": "mysql.example.invalid",
        "db_name": "cesta_test",
        "db_user": "cesta_user",
        "db_password": "senha-sintetica",
        "db_ssl_required": True,
        "first_admin_name": "Administrador",
        "first_admin_email": "admin@example.invalid",
        "first_admin_password": "SenhaUnica@123",
        "secret_key": "segredo-sintetico-com-mais-de-trinta-e-dois-caracteres",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


class RuntimeSecurityConfigTests(unittest.TestCase):
    def test_staging_rejects_database_tls_disabled(self):
        with self.assertRaisesRegex(ValidationError, "DB_SSL_REQUIRED"):
            build_settings(db_ssl_required=False)

    def test_production_rejects_database_tls_disabled(self):
        with self.assertRaisesRegex(ValidationError, "DB_SSL_REQUIRED"):
            build_settings(app_env="production", db_ssl_required=False)

    def test_staging_accepts_required_tls_with_system_or_custom_trust(self):
        without_custom_ca = build_settings(db_ssl_ca=None)
        with_custom_ca = build_settings(db_ssl_ca="/etc/secrets/aiven-ca.pem")

        self.assertTrue(without_custom_ca.db_ssl_required)
        self.assertIsNone(without_custom_ca.db_ssl_ca)
        self.assertEqual(with_custom_ca.db_ssl_ca, "/etc/secrets/aiven-ca.pem")


if __name__ == "__main__":
    unittest.main()
