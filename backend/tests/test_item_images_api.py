import io
from unittest.mock import patch

from PIL import Image
from sqlalchemy import select

from integration_test_case import ApiIntegrationTestCase
from app.models.audit_log import AuditLog


def _image_bytes(
    *,
    image_format: str = "PNG",
    color: tuple[int, int, int] = (239, 29, 105),
) -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (640, 480), color=color).save(output, format=image_format)
    return output.getvalue()


class ItemImagesApiTests(ApiIntegrationTestCase):
    def setUp(self):
        super().setUp()
        self.create_user(
            name="Operador de Estoque",
            email="imagem-estoque@example.com",
            password="Imagem@12345",
            roles=("operador",),
            login_name="imagem-estoque",
        )
        self.create_user(
            name="Lider Social",
            email="imagem-social@example.com",
            password="Imagem@12345",
            roles=("lider_social",),
            login_name="imagem-social",
        )
        self.operator_headers = self.login_and_get_headers(
            "imagem-estoque",
            "Imagem@12345",
        )
        self.social_headers = self.login_and_get_headers(
            "imagem-social",
            "Imagem@12345",
        )
        self.category = self.create_item_category(
            self.operator_headers,
            name="Alimentos",
        )

    def _create_item(self, *, name: str = "Leite em po", barcode=None) -> dict:
        response = self.client.post(
            "/items",
            headers=self.operator_headers,
            json={
                "category_id": self.category["id"],
                "name": name,
                "barcode": barcode,
                "unit_measure": "unidade",
                "tracks_expiration": True,
                "is_active": True,
                "reference_unit_value": 18,
                "minimum_stock_alert": 10,
                "notes": None,
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_upload_serves_versioned_webp_and_supports_replace_and_delete(self):
        item = self._create_item()
        self.assertFalse(item["has_image"])
        self.assertIsNone(item["image_path"])

        upload = self.client.post(
            f"/items/{item['id']}/image",
            headers=self.operator_headers,
            files={
                "image": (
                    "leite.png",
                    _image_bytes(),
                    "image/png",
                )
            },
        )
        self.assertEqual(upload.status_code, 200, upload.text)
        metadata = upload.json()
        self.assertEqual(metadata["source"], "upload")
        self.assertEqual(metadata["mime_type"], "image/webp")
        self.assertLess(metadata["size_bytes"], len(_image_bytes()))
        self.assertIn(f"/public/items/{item['id']}/image?v=", metadata["image_path"])

        detail = self.client.get(
            f"/items/{item['id']}",
            headers=self.operator_headers,
        )
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertTrue(detail.json()["has_image"])
        self.assertEqual(detail.json()["image_path"], metadata["image_path"])

        overview = self.client.get(
            "/stock-overview",
            headers=self.operator_headers,
        )
        self.assertEqual(overview.status_code, 200, overview.text)
        self.assertEqual(overview.json()["items"][0]["image_path"], metadata["image_path"])

        self.client.cookies.clear()
        public_image = self.client.get(metadata["image_path"])
        self.assertEqual(public_image.status_code, 200, public_image.text)
        self.assertEqual(public_image.headers["content-type"], "image/webp")
        self.assertEqual(public_image.content[:4], b"RIFF")
        self.assertIn("immutable", public_image.headers["cache-control"])
        etag = public_image.headers["etag"]

        cached = self.client.get(
            metadata["image_path"],
            headers={"If-None-Match": etag},
        )
        self.assertEqual(cached.status_code, 304)
        self.assertEqual(cached.content, b"")

        replacement = self.client.post(
            f"/items/{item['id']}/image",
            headers=self.operator_headers,
            files={
                "image": (
                    "leite.jpg",
                    _image_bytes(image_format="JPEG", color=(92, 62, 217)),
                    "image/jpeg",
                )
            },
        )
        self.assertEqual(replacement.status_code, 200, replacement.text)
        self.assertNotEqual(replacement.json()["sha256"], metadata["sha256"])

        deleted = self.client.delete(
            f"/items/{item['id']}/image",
            headers=self.operator_headers,
        )
        self.assertEqual(deleted.status_code, 204, deleted.text)
        missing = self.client.get(replacement.json()["image_path"])
        self.assertEqual(missing.status_code, 404)

    def test_upload_rejects_unsafe_content_and_preserves_inventory_rbac(self):
        item = self._create_item()

        invalid = self.client.post(
            f"/items/{item['id']}/image",
            headers=self.operator_headers,
            files={"image": ("produto.png", b"nao e uma imagem", "image/png")},
        )
        self.assertEqual(invalid.status_code, 422, invalid.text)

        unsupported = self.client.post(
            f"/items/{item['id']}/image",
            headers=self.operator_headers,
            files={"image": ("produto.svg", b"<svg></svg>", "image/svg+xml")},
        )
        self.assertEqual(unsupported.status_code, 422, unsupported.text)

        oversized = self.client.post(
            f"/items/{item['id']}/image",
            headers=self.operator_headers,
            files={"image": ("produto.png", b"0" * (5 * 1024 * 1024 + 1), "image/png")},
        )
        self.assertEqual(oversized.status_code, 413, oversized.text)

        forbidden = self.client.post(
            f"/items/{item['id']}/image",
            headers=self.social_headers,
            files={"image": ("produto.png", _image_bytes(), "image/png")},
        )
        self.assertEqual(forbidden.status_code, 403, forbidden.text)

        self.client.cookies.clear()
        anonymous = self.client.post(
            f"/items/{item['id']}/image",
            files={"image": ("produto.png", _image_bytes(), "image/png")},
        )
        self.assertEqual(anonymous.status_code, 401, anonymous.text)

    def test_barcode_is_normalized_validated_and_unique(self):
        item = self._create_item(barcode="7891-0001 0010-3")
        self.assertEqual(item["barcode"], "7891000100103")

        duplicate = self.client.post(
            "/items",
            headers=self.operator_headers,
            json={
                "category_id": self.category["id"],
                "name": "Outro produto",
                "barcode": "7891000100103",
                "unit_measure": "unidade",
            },
        )
        self.assertEqual(duplicate.status_code, 409, duplicate.text)

        invalid = self.client.post(
            "/items",
            headers=self.operator_headers,
            json={
                "category_id": self.category["id"],
                "name": "Codigo invalido",
                "barcode": "ABC-123",
                "unit_measure": "unidade",
            },
        )
        self.assertEqual(invalid.status_code, 422, invalid.text)

    @patch("app.services.product_image_service._read_remote_image")
    @patch("app.services.product_image_service.lookup_open_facts_candidate")
    def test_open_facts_import_is_explicit_persistent_and_attributed(
        self,
        mocked_lookup,
        mocked_download,
    ):
        item = self._create_item()
        mocked_lookup.return_value = {
            "barcode": "7891000100103",
            "found": True,
            "has_image": True,
            "product_name": "Leite condensado",
            "brands": "Moca",
            "quantity": "395 g",
            "image_url": "https://images.openfoodfacts.org/images/products/789/100/010/0103/front.jpg",
            "source_name": "Open Food Facts",
            "attribution": "Open Food Facts contributors · CC BY-SA 3.0",
            "license_name": "CC BY-SA 3.0",
            "license_url": "https://creativecommons.org/licenses/by-sa/3.0/",
        }
        mocked_download.return_value = _image_bytes(image_format="JPEG")

        imported = self.client.post(
            f"/items/{item['id']}/image/import-open-facts",
            headers=self.operator_headers,
            json={"barcode": "7891000100103"},
        )
        self.assertEqual(imported.status_code, 200, imported.text)
        metadata = imported.json()
        self.assertEqual(metadata["source"], "open_facts")
        self.assertEqual(
            metadata["attribution"],
            "Open Food Facts contributors · CC BY-SA 3.0",
        )
        mocked_download.assert_called_once_with(mocked_lookup.return_value["image_url"])

        detail = self.client.get(
            f"/items/{item['id']}",
            headers=self.operator_headers,
        )
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertEqual(detail.json()["barcode"], "7891000100103")
        self.assertEqual(detail.json()["image_source"], "open_facts")
        self.assertEqual(detail.json()["image_attribution"], metadata["attribution"])

        with self.session_factory() as db:
            event_types = list(
                db.scalars(
                    select(AuditLog.event_type).where(AuditLog.entity_id == str(item["id"]))
                ).all()
            )
        self.assertIn("item.barcode.updated_from_open_facts", event_types)
        self.assertIn("item.image.created", event_types)

    @patch("app.api.routes.item_images.lookup_open_facts_candidate")
    def test_open_facts_lookup_does_not_write_and_reports_missing_image(self, mocked_lookup):
        mocked_lookup.return_value = {
            "barcode": "7891000100103",
            "found": True,
            "has_image": False,
            "product_name": "Produto conhecido",
            "brands": "Marca",
            "quantity": "1 un",
            "image_url": None,
            "source_name": "Open Food Facts",
            "attribution": "Open Food Facts contributors · CC BY-SA 3.0",
            "license_name": "CC BY-SA 3.0",
            "license_url": "https://creativecommons.org/licenses/by-sa/3.0/",
        }

        response = self.client.get(
            "/product-images/open-facts",
            headers=self.operator_headers,
            params={"barcode": "7891000100103"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["found"])
        self.assertFalse(response.json()["has_image"])
        self.assertIsNone(response.json()["image_url"])

        items = self.client.get("/items", headers=self.operator_headers)
        self.assertEqual(items.status_code, 200, items.text)
        self.assertEqual(items.json(), [])
