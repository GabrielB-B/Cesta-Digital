from pydantic import BaseModel


class StockSummaryResponse(BaseModel):
    """Resumo consolidado do estoque por item."""

    item_id: int
    item_name: str
    category_id: int
    category_name: str
    unit_measure: str
    tracks_expiration: bool
    is_active: bool
    minimum_stock_alert: int
    total_quantity: int
    total_batches: int
    is_below_minimum: bool


class StockAlertResponse(BaseModel):
    """Resposta específica para itens com atenção de estoque."""

    item_id: int
    item_name: str
    category_name: str
    minimum_stock_alert: int
    total_quantity: int
    is_below_minimum: bool