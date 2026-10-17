from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


ReportKey = Literal[
    "attendances",
    "deliveries",
    "stock_movements",
    "benefits",
    "families",
    "stock_alerts",
]


class ReportKpisResponse(BaseModel):
    """Indicadores reais calculados para o período selecionado."""

    families_served: int
    baskets_delivered: int
    items_distributed: int


class ReportDefinitionResponse(BaseModel):
    """Relatório que o perfil autenticado pode gerar."""

    key: ReportKey
    title: str
    description: str
    format: Literal["csv"] = "csv"
    uses_period: bool = True


class ReportsOverviewResponse(BaseModel):
    """Visão consolidada e governada da área de relatórios."""

    start_date: date
    end_date: date
    generated_at: datetime
    kpis: ReportKpisResponse
    available_reports: list[ReportDefinitionResponse]
