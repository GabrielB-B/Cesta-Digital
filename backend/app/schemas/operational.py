from pydantic import BaseModel


class OperationalFamilyResponse(BaseModel):
    """Projeção mínima para identificação logística, sem dados sociais sensíveis."""

    id: int
    display_name: str
    status: str
    total_residents: int
    neighborhood: str
    city: str
    state: str
    eligible_for_delivery: bool


class OperationalBasketTypeResponse(BaseModel):
    """Opção mínima de cesta usada no registro de uma entrega."""

    id: int
    name: str
