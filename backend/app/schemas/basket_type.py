from pydantic import BaseModel, ConfigDict, field_validator


class BasketTypeCreate(BaseModel):
    """Payload para criação de tipo de cesta."""

    name: str
    is_active: bool = True
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("O nome do tipo de cesta é obrigatório.")
        return value


class BasketTypeResponse(BaseModel):
    """Resposta serializada de tipo de cesta."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_active: bool
    notes: str | None


class BasketTypeItemCreate(BaseModel):
    """Payload para adicionar item à receita da cesta."""

    item_id: int
    required_quantity: int

    @field_validator("required_quantity")
    @classmethod
    def validate_required_quantity(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("A quantidade exigida deve ser maior que zero.")
        return value


class BasketTypeItemResponse(BaseModel):
    """Resposta serializada de item da receita da cesta."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    basket_type_id: int
    item_id: int
    required_quantity: int


class BasketTypeRecipeItemResponse(BaseModel):
    item_id: int
    item_name: str
    unit_measure: str
    required_quantity: int


class BasketTypeDetailResponse(BasketTypeResponse):
    basket_items: list[BasketTypeRecipeItemResponse]