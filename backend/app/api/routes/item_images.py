from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, Request, Response, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.product_image import (
    ItemImageMetadataResponse,
    OpenFactsCandidateResponse,
    OpenFactsImportRequest,
)
from app.services.product_image_service import (
    delete_item_image,
    get_public_item_image,
    import_open_facts_image,
    lookup_open_facts_candidate,
    upload_item_image,
)


router = APIRouter(
    tags=["Imagens de Produtos"],
    dependencies=[Depends(require_any_role("admin", "operador"))],
)
public_router = APIRouter(tags=["Imagens Publicas de Produtos"])


@router.get(
    "/product-images/open-facts",
    response_model=OpenFactsCandidateResponse,
)
def lookup_open_facts_endpoint(
    barcode: str = Query(min_length=8, max_length=32),
):
    """Consulta assistida e explicita; nao persiste nenhuma imagem."""
    return lookup_open_facts_candidate(barcode)


@router.post(
    "/items/{item_id}/image",
    response_model=ItemImageMetadataResponse,
)
async def upload_item_image_endpoint(
    item_id: int,
    image: Annotated[UploadFile, File(description="JPEG, PNG ou WebP; maximo 5 MB")],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    raw_image = await image.read(settings.product_image_max_upload_bytes + 1)
    await image.close()
    return upload_item_image(
        db,
        item_id=item_id,
        raw_image=raw_image,
        declared_content_type=image.content_type,
        current_user=current_user,
    )


@router.post(
    "/items/{item_id}/image/import-open-facts",
    response_model=ItemImageMetadataResponse,
)
def import_open_facts_image_endpoint(
    item_id: int,
    payload: OpenFactsImportRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return import_open_facts_image(
        db,
        item_id=item_id,
        barcode=payload.barcode,
        current_user=current_user,
    )


@router.delete("/items/{item_id}/image", status_code=204)
def delete_item_image_endpoint(
    item_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    delete_item_image(db, item_id=item_id, current_user=current_user)
    return Response(status_code=204)


@public_router.get("/public/items/{item_id}/image")
def get_public_item_image_endpoint(
    item_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    image = get_public_item_image(db, item_id)
    etag = f'"{image.sha256}"'
    headers = {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": "inline",
        "ETag": etag,
    }
    if request.headers.get("If-None-Match") == etag:
        return Response(status_code=304, headers=headers)
    return Response(content=image.content, media_type=image.mime_type, headers=headers)
