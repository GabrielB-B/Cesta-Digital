from datetime import date

from pydantic import BaseModel


class DashboardBasketSummaryResponse(BaseModel):
    """Resumo de cestas possíveis por tipo."""

    basket_type_id: int
    basket_type_name: str
    possible_baskets: int


class DashboardRevaluationResponse(BaseModel):
    """Famílias com reavaliação próxima."""

    family_id: int
    internal_code: str
    status: str
    next_revaluation_date: date


class DashboardStockAlertResponse(BaseModel):
    """Itens com estoque abaixo do mínimo."""

    item_id: int
    item_name: str
    category_name: str
    minimum_stock_alert: int
    total_quantity: int
    is_below_minimum: bool


class DashboardOverviewResponse(BaseModel):
    """Visão geral inicial do Cesta Digital."""

    total_families: int
    active_families: int
    recurring_eligible_families: int
    emergency_eligible_families: int
    under_review_families: int
    inactive_families: int

    pending_schedules: int
    deliveries_this_month: int

    upcoming_revaluations_count: int
    items_below_minimum_count: int

    basket_summaries: list[DashboardBasketSummaryResponse]
    upcoming_revaluations: list[DashboardRevaluationResponse]
    stock_alerts: list[DashboardStockAlertResponse]