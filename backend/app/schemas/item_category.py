from pydantic import BaseModel, ConfigDict, field_validator


class ItemCategoryCreate(BaseModel):
    """Payload para criação de categoria de item."""

    name: str
    description: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("O nome da categoria é obrigatório.")
        return value


class ItemCategoryResponse(BaseModel):
    """Resposta serializada de categoria de item."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None