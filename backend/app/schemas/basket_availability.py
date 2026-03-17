from pydantic import BaseModel


class BasketAvailabilityItemResponse(BaseModel):
    """Resumo de disponibilidade de um item dentro da receita da cesta."""

    item_id: int
    item_name: str
    unit_measure: str
    required_quantity: int
    available_quantity: int
    possible_from_item: int
    missing_for_next_basket: int


class BasketAvailabilityResponse(BaseModel):
    """Resposta consolidada da disponibilidade de um tipo de cesta."""

    basket_type_id: int
    basket_type_name: str
    possible_baskets: int
    limiting_item_ids: list[int]
    items: list[BasketAvailabilityItemResponse]