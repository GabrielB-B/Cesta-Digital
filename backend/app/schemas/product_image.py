from pydantic import BaseModel, field_validator

from app.core.barcode import normalize_barcode


class OpenFactsImportRequest(BaseModel):
    barcode: str

    @field_validator("barcode")
    @classmethod
    def validate_barcode(cls, value: str) -> str:
        normalized = normalize_barcode(value)
        if normalized is None:
            raise ValueError("O codigo de barras e obrigatorio.")
        return normalized


class OpenFactsCandidateResponse(BaseModel):
    barcode: str
    found: bool
    has_image: bool
    product_name: str | None
    brands: str | None
    quantity: str | None
    image_url: str | None
    source_name: str
    attribution: str
    license_name: str
    license_url: str


class ItemImageMetadataResponse(BaseModel):
    item_id: int
    image_path: str
    mime_type: str
    size_bytes: int
    sha256: str
    source: str
    source_url: str | None
    attribution: str | None
