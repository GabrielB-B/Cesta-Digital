from datetime import date
from typing import Literal

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


StockOverviewAttention = Literal[
    "estoque_baixo",
    "vencendo_em_breve",
    "vencido",
    "validade_ausente",
    "restrito",
]


class StockOverviewItemResponse(StockSummaryResponse):
    """Projecao operacional de item com riscos agregados por lote."""

    next_expiration_date: date | None
    expiring_soon_batches: int
    expired_batches: int
    missing_expiration_batches: int
    restricted_batches: int


class StockOverviewSummaryResponse(BaseModel):
    """Contadores globais sem depender da pagina atual."""

    total_items: int
    active_items: int
    low_stock_items: int
    expiring_soon_batches: int
    expired_batches: int
    missing_expiration_batches: int
    restricted_batches: int


class StockOverviewResponse(BaseModel):
    items: list[StockOverviewItemResponse]
    total: int
    limit: int
    offset: int
    reference_date: date
    due_soon_days: int
    summary: StockOverviewSummaryResponse
