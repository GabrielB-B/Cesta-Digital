from pydantic import BaseModel, ConfigDict, field_validator


ALLOWED_MOVEMENT_TYPES = {
    "saida_manual",
    "perda_validade",
    "ajuste_negativo",
    "ajuste_positivo",
}


class StockMovementCreate(BaseModel):
    """Payload para registrar uma movimentação de estoque."""

    batch_id: int
    movement_type: str
    quantity: int
    notes: str | None = None

    @field_validator("movement_type")
    @classmethod
    def validate_movement_type(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in ALLOWED_MOVEMENT_TYPES:
            raise ValueError("Tipo de movimentação inválido.")
        return value

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("A quantidade da movimentação deve ser maior que zero.")
        return value


class StockMovementResponse(BaseModel):
    """Resposta serializada de movimentação de estoque."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    batch_id: int
    item_id: int
    movement_type: str
    quantity: int
    notes: str | None
    created_by_user_id: int