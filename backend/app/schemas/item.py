from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator


ALLOWED_UNIT_MEASURES = {
    "unidade",
    "pacote",
    "kg",
    "litro",
    "caixa",
    "frasco",
}


class ItemCreate(BaseModel):
    """Payload para criação de item do estoque."""

    category_id: int
    name: str
    unit_measure: str
    tracks_expiration: bool = True
    is_active: bool = True
    reference_unit_value: Decimal = Decimal("0.00")
    minimum_stock_alert: int = 0
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("O nome do item é obrigatório.")
        return value

    @field_validator("unit_measure")
    @classmethod
    def validate_unit_measure(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in ALLOWED_UNIT_MEASURES:
            raise ValueError("Unidade de medida inválida.")
        return value

    @field_validator("reference_unit_value")
    @classmethod
    def validate_reference_unit_value(cls, value: Decimal) -> Decimal:
        if value < 0:
            raise ValueError("O valor de referência não pode ser negativo.")
        return value

    @field_validator("minimum_stock_alert")
    @classmethod
    def validate_minimum_stock_alert(cls, value: int) -> int:
        if value < 0:
            raise ValueError("O alerta mínimo de estoque não pode ser negativo.")
        return value


class ItemResponse(BaseModel):
    """Resposta serializada de item do estoque."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    name: str
    unit_measure: str
    tracks_expiration: bool
    is_active: bool
    reference_unit_value: Decimal
    minimum_stock_alert: int
    notes: str | None


class ItemDetailResponse(ItemResponse):
    category_name: str