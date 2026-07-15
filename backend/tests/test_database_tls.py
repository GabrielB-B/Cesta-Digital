import ssl
import unittest
from unittest.mock import MagicMock, patch

from app.db.tls import build_database_ssl_context


class DatabaseTlsTests(unittest.TestCase):
    def test_tls_disabled_does_not_create_context(self):
        context = build_database_ssl_context(
            ssl_required=False,
            ca_source=None,
        )

        self.assertIsNone(context)

    @patch("app.db.tls.ssl.create_default_context")
    def test_tls_uses_system_trust_and_verifies_hostname(self, create_context):
        context = MagicMock()
        create_context.return_value = context

        result = build_database_ssl_context(
            ssl_required=True,
            ca_source=None,
        )

        self.assertIs(result, context)
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(context.check_hostname)
        context.load_verify_locations.assert_not_called()

    @patch("app.db.tls.ssl.create_default_context")
    def test_tls_accepts_custom_ca_file(self, create_context):
        context = MagicMock()
        create_context.return_value = context

        build_database_ssl_context(
            ssl_required=True,
            ca_source="/etc/secrets/aiven-ca.pem",
        )

        context.load_verify_locations.assert_called_once_with(
            cafile="/etc/secrets/aiven-ca.pem"
        )
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(context.check_hostname)

    @patch("app.db.tls.ssl.create_default_context")
    def test_tls_accepts_inline_ca_certificate(self, create_context):
        context = MagicMock()
        create_context.return_value = context
        certificate = (
            "-----BEGIN CERTIFICATE-----\n"
            "dados-sinteticos\n"
            "-----END CERTIFICATE-----"
        )

        build_database_ssl_context(
            ssl_required=True,
            ca_source=certificate,
        )

        context.load_verify_locations.assert_called_once_with(cadata=certificate)
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(context.check_hostname)


if __name__ == "__main__":
    unittest.main()
