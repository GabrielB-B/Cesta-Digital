from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator


ALLOWED_SOURCE_TYPES = {
    "doacao_item",
    "compra_igreja",
    "conversao_dinheiro",
    "ajuste",
}


class StockBatchCreate(BaseModel):
    """Payload para registrar entrada de lote no estoque."""

    item_id: int
    source_type: str
    entry_quantity: int
    entry_date: date
    expiration_date: date | None = None
    estimated_unit_value: Decimal = Decimal("0.00")
    notes: str | None = None

    @field_validator("source_type")
    @classmethod
    def validate_source_type(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in ALLOWED_SOURCE_TYPES:
            raise ValueError("Tipo de origem inválido.")
        return value

    @field_validator("entry_quantity")
    @classmethod
    def validate_entry_quantity(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("A quantidade de entrada deve ser maior que zero.")
        return value

    @field_validator("estimated_unit_value")
    @classmethod
    def validate_estimated_unit_value(cls, value: Decimal) -> Decimal:
        if value < 0:
            raise ValueError("O valor unitário estimado não pode ser negativo.")
        return value


class StockBatchResponse(BaseModel):
    """Resposta serializada de lote de estoque."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    source_type: str
    entry_quantity: int
    current_quantity: int
    entry_date: date
    expiration_date: date | None
    estimated_unit_value: Decimal
    notes: str | None
    created_by_user_id: int