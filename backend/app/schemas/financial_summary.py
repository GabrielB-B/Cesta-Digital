from decimal import Decimal

from pydantic import BaseModel


class FinancialCategorySummaryResponse(BaseModel):
    """Resumo financeiro estimado por categoria de item."""

    category_id: int
    category_name: str
    estimated_stock_value: Decimal


class FinancialSummaryResponse(BaseModel):
    """Visão financeira inicial para prestação de contas."""

    estimated_total_stock_value: Decimal
    estimated_total_entries_value: Decimal
    estimated_total_output_value: Decimal
    active_benefits_total_value: Decimal
    categories: list[FinancialCategorySummaryResponse]