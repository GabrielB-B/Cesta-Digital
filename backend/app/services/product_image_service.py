from __future__ import annotations

import hashlib
import io
import json
import warnings
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, undefer

from app.core.barcode import normalize_barcode
from app.core.config import settings
from app.models.item import Item
from app.models.item_image import ItemImage
from app.models.user import User
from app.services.audit_log_service import record_audit_log


OPEN_FACTS_LICENSE_NAME = "CC BY-SA 3.0"
OPEN_FACTS_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/3.0/"
OPEN_FACTS_API_URL = "https://world.openfoodfacts.org/api/v3/product/{barcode}"
OPEN_FACTS_IMAGE_HOSTS = {
    "images.openfoodfacts.org": "Open Food Facts",
    "images.openbeautyfacts.org": "Open Beauty Facts",
    "images.openproductsfacts.org": "Open Products Facts",
    "images.openpetfoodfacts.org": "Open Pet Food Facts",
}
ALLOWED_UPLOAD_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_OPEN_FACTS_RESPONSE_BYTES = 1024 * 1024


@dataclass(frozen=True)
class NormalizedImage:
    content: bytes
    mime_type: str
    sha256: str


def _source_details(image_url: str | None) -> tuple[str, str]:
    if image_url:
        host = (urlparse(image_url).hostname or "").lower()
        source_name = OPEN_FACTS_IMAGE_HOSTS.get(host, "Open Facts")
    else:
        source_name = "Open Facts"
    return source_name, f"{source_name} contributors · {OPEN_FACTS_LICENSE_NAME}"


def _as_optional_text(value) -> str | None:
    if isinstance(value, str):
        normalized = value.strip()
        return normalized or None
    return None


def _validated_open_facts_image_url(value: str | None) -> str | None:
    image_url = _as_optional_text(value)
    if image_url is None:
        return None
    parsed = urlparse(image_url)
    if parsed.scheme != "https" or (parsed.hostname or "").lower() not in OPEN_FACTS_IMAGE_HOSTS:
        return None
    return image_url


def _empty_open_facts_candidate(barcode: str) -> dict:
    source_name, attribution = _source_details(None)
    return {
        "barcode": barcode,
        "found": False,
        "has_image": False,
        "product_name": None,
        "brands": None,
        "quantity": None,
        "image_url": None,
        "source_name": source_name,
        "attribution": attribution,
        "license_name": OPEN_FACTS_LICENSE_NAME,
        "license_url": OPEN_FACTS_LICENSE_URL,
    }


def lookup_open_facts_candidate(barcode_value: str) -> dict:
    """Consulta pontual por codigo; nenhuma busca externa ocorre na listagem."""
    try:
        barcode = normalize_barcode(barcode_value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if barcode is None:
        raise HTTPException(status_code=422, detail="O codigo de barras e obrigatorio.")

    query = "fields=code,product_name,brands,quantity,image_front_url&product_type=all"
    url = f"{OPEN_FACTS_API_URL.format(barcode=quote(barcode))}?{query}"
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": settings.open_facts_user_agent,
        },
    )

    try:
        with urlopen(request, timeout=settings.open_facts_timeout_seconds) as response:
            raw_body = response.read(MAX_OPEN_FACTS_RESPONSE_BYTES + 1)
    except HTTPError as exc:
        if exc.code == 404:
            return _empty_open_facts_candidate(barcode)
        raise HTTPException(
            status_code=502,
            detail="O catalogo Open Facts nao respondeu corretamente.",
        ) from exc
    except (TimeoutError, URLError) as exc:
        raise HTTPException(
            status_code=504,
            detail="O catalogo Open Facts demorou mais que o permitido.",
        ) from exc

    if len(raw_body) > MAX_OPEN_FACTS_RESPONSE_BYTES:
        raise HTTPException(
            status_code=502,
            detail="A resposta do catalogo Open Facts excedeu o limite seguro.",
        )

    try:
        body = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=502,
            detail="O catalogo Open Facts retornou dados invalidos.",
        ) from exc

    product = body.get("product") if isinstance(body, dict) else None
    if not isinstance(product, dict) or not product:
        return _empty_open_facts_candidate(barcode)

    image_url = _validated_open_facts_image_url(product.get("image_front_url"))
    source_name, attribution = _source_details(image_url)
    return {
        "barcode": barcode,
        "found": True,
        "has_image": image_url is not None,
        "product_name": _as_optional_text(product.get("product_name")),
        "brands": _as_optional_text(product.get("brands")),
        "quantity": _as_optional_text(product.get("quantity")),
        "image_url": image_url,
        "source_name": source_name,
        "attribution": attribution,
        "license_name": OPEN_FACTS_LICENSE_NAME,
        "license_url": OPEN_FACTS_LICENSE_URL,
    }


def _read_remote_image(image_url: str) -> bytes:
    trusted_url = _validated_open_facts_image_url(image_url)
    if trusted_url is None:
        raise HTTPException(status_code=422, detail="URL de imagem externa nao confiavel.")

    request = Request(
        trusted_url,
        headers={
            "Accept": "image/jpeg,image/png,image/webp",
            "User-Agent": settings.open_facts_user_agent,
        },
    )
    try:
        with urlopen(request, timeout=settings.open_facts_timeout_seconds) as response:
            final_url = response.geturl()
            if _validated_open_facts_image_url(final_url) is None:
                raise HTTPException(
                    status_code=422,
                    detail="O catalogo redirecionou para uma origem nao confiavel.",
                )
            content_type = response.headers.get_content_type()
            content_length = response.headers.get("Content-Length")
            if content_type not in ALLOWED_UPLOAD_CONTENT_TYPES:
                raise HTTPException(
                    status_code=422,
                    detail="O catalogo nao retornou uma imagem JPEG, PNG ou WebP.",
                )
            if content_length and int(content_length) > settings.product_image_max_upload_bytes:
                raise HTTPException(
                    status_code=413,
                    detail="A imagem do catalogo excede o limite de 5 MB.",
                )
            raw_image = response.read(settings.product_image_max_upload_bytes + 1)
    except HTTPException:
        raise
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Nao foi possivel importar a imagem do catalogo Open Facts.",
        ) from exc

    if len(raw_image) > settings.product_image_max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail="A imagem do catalogo excede o limite de 5 MB.",
        )
    return raw_image


def normalize_product_image(
    raw_image: bytes,
    *,
    declared_content_type: str | None,
) -> NormalizedImage:
    if declared_content_type not in ALLOWED_UPLOAD_CONTENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail="Envie uma imagem JPEG, PNG ou WebP.",
        )
    if not raw_image:
        raise HTTPException(status_code=422, detail="O arquivo de imagem esta vazio.")
    if len(raw_image) > settings.product_image_max_upload_bytes:
        raise HTTPException(status_code=413, detail="A imagem excede o limite de 5 MB.")

    Image.MAX_IMAGE_PIXELS = 25_000_000
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw_image)) as probe:
                if probe.format not in ALLOWED_PIL_FORMATS:
                    raise HTTPException(
                        status_code=422,
                        detail="O conteudo nao e uma imagem JPEG, PNG ou WebP valida.",
                    )
                probe.verify()

            with Image.open(io.BytesIO(raw_image)) as source:
                source.load()
                normalized = ImageOps.exif_transpose(source)
                has_alpha = normalized.mode in {"RGBA", "LA"} or "transparency" in normalized.info
                normalized = normalized.convert("RGBA" if has_alpha else "RGB")
                normalized.thumbnail(
                    (
                        settings.product_image_max_dimension,
                        settings.product_image_max_dimension,
                    ),
                    Image.Resampling.LANCZOS,
                )

                encoded = b""
                for quality in (84, 76, 68, 60):
                    output = io.BytesIO()
                    normalized.save(
                        output,
                        format="WEBP",
                        quality=quality,
                        method=6,
                    )
                    encoded = output.getvalue()
                    if len(encoded) <= settings.product_image_max_stored_bytes:
                        break

                resize_attempts = 0
                while (
                    len(encoded) > settings.product_image_max_stored_bytes
                    and min(normalized.size) > 320
                    and resize_attempts < 4
                ):
                    resized_size = (
                        max(320, int(normalized.width * 0.82)),
                        max(320, int(normalized.height * 0.82)),
                    )
                    normalized = normalized.resize(resized_size, Image.Resampling.LANCZOS)
                    output = io.BytesIO()
                    normalized.save(output, format="WEBP", quality=60, method=6)
                    encoded = output.getvalue()
                    resize_attempts += 1
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(
            status_code=422,
            detail="O arquivo enviado nao e uma imagem valida ou segura.",
        ) from exc
    except Image.DecompressionBombWarning as exc:
        raise HTTPException(
            status_code=422,
            detail="A imagem possui dimensoes excessivas.",
        ) from exc

    if len(encoded) > settings.product_image_max_stored_bytes:
        raise HTTPException(
            status_code=413,
            detail="Nao foi possivel reduzir a imagem ao limite seguro.",
        )

    return NormalizedImage(
        content=encoded,
        mime_type="image/webp",
        sha256=hashlib.sha256(encoded).hexdigest(),
    )


def _image_metadata(image: ItemImage) -> dict:
    return {
        "item_id": image.item_id,
        "image_path": f"/public/items/{image.item_id}/image?v={image.sha256[:12]}",
        "mime_type": image.mime_type,
        "size_bytes": image.size_bytes,
        "sha256": image.sha256,
        "source": image.source,
        "source_url": image.source_url,
        "attribution": image.attribution,
    }


def _store_item_image(
    db: Session,
    *,
    item: Item,
    normalized: NormalizedImage,
    source: str,
    source_url: str | None,
    attribution: str | None,
    current_user: User,
) -> dict:
    image = db.scalar(select(ItemImage).where(ItemImage.item_id == item.id))
    event_type = "item.image.replaced" if image is not None else "item.image.created"
    previous_sha256 = image.sha256 if image is not None else None
    if image is None:
        image = ItemImage(item_id=item.id, created_by_user_id=current_user.id)
        db.add(image)

    image.content = normalized.content
    image.mime_type = normalized.mime_type
    image.size_bytes = len(normalized.content)
    image.sha256 = normalized.sha256
    image.source = source
    image.source_url = source_url
    image.attribution = attribution
    image.created_by_user_id = current_user.id

    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A imagem deste produto foi alterada por outra operacao.",
        ) from exc

    record_audit_log(
        db,
        event_type=event_type,
        actor_user=current_user,
        entity_type="item",
        entity_id=item.id,
        details={
            "source": source,
            "sha256": image.sha256,
            "previous_sha256": previous_sha256,
            "size_bytes": image.size_bytes,
        },
    )
    db.commit()
    db.refresh(image)
    return _image_metadata(image)


def upload_item_image(
    db: Session,
    *,
    item_id: int,
    raw_image: bytes,
    declared_content_type: str | None,
    current_user: User,
) -> dict:
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item nao encontrado.")
    normalized = normalize_product_image(
        raw_image,
        declared_content_type=declared_content_type,
    )
    return _store_item_image(
        db,
        item=item,
        normalized=normalized,
        source="upload",
        source_url=None,
        attribution=None,
        current_user=current_user,
    )


def import_open_facts_image(
    db: Session,
    *,
    item_id: int,
    barcode: str,
    current_user: User,
) -> dict:
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item nao encontrado.")

    candidate = lookup_open_facts_candidate(barcode)
    if not candidate["found"]:
        raise HTTPException(status_code=404, detail="Produto nao encontrado no Open Facts.")
    if not candidate["has_image"] or not candidate["image_url"]:
        raise HTTPException(
            status_code=404,
            detail="O produto foi encontrado, mas ainda nao possui imagem.",
        )

    duplicate_item_id = db.scalar(
        select(Item.id).where(Item.barcode == candidate["barcode"], Item.id != item.id)
    )
    if duplicate_item_id is not None:
        raise HTTPException(
            status_code=409,
            detail="Este codigo de barras ja pertence a outro produto.",
        )

    raw_image = _read_remote_image(candidate["image_url"])
    normalized = normalize_product_image(raw_image, declared_content_type="image/jpeg")
    previous_barcode = item.barcode
    item.barcode = candidate["barcode"]
    if previous_barcode != item.barcode:
        record_audit_log(
            db,
            event_type="item.barcode.updated_from_open_facts",
            actor_user=current_user,
            entity_type="item",
            entity_id=item.id,
            details={
                "previous_barcode": previous_barcode,
                "barcode": item.barcode,
                "source": "open_facts",
            },
        )
    return _store_item_image(
        db,
        item=item,
        normalized=normalized,
        source="open_facts",
        source_url=candidate["image_url"],
        attribution=candidate["attribution"],
        current_user=current_user,
    )


def delete_item_image(
    db: Session,
    *,
    item_id: int,
    current_user: User,
) -> None:
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item nao encontrado.")
    image = db.scalar(select(ItemImage).where(ItemImage.item_id == item_id))
    if image is None:
        raise HTTPException(status_code=404, detail="Este produto nao possui imagem.")

    previous = {
        "source": image.source,
        "sha256": image.sha256,
        "size_bytes": image.size_bytes,
    }
    db.delete(image)
    record_audit_log(
        db,
        event_type="item.image.deleted",
        actor_user=current_user,
        entity_type="item",
        entity_id=item_id,
        details=previous,
    )
    db.commit()


def get_public_item_image(db: Session, item_id: int) -> ItemImage:
    image = db.scalar(
        select(ItemImage)
        .options(undefer(ItemImage.content))
        .where(ItemImage.item_id == item_id)
    )
    if image is None:
        raise HTTPException(status_code=404, detail="Imagem de produto nao encontrada.")
    return image
