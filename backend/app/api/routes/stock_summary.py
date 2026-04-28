from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.stock_summary import StockAlertResponse, StockSummaryResponse
from app.services.stock_summary_service import list_stock_alerts, list_stock_summary

router = APIRouter(
    tags=["Resumo de Estoque"],
    dependencies=[Depends(require_any_role("admin", "operador"))],
)


@router.get("/stock-summary", response_model=list[StockSummaryResponse])
def list_stock_summary_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista o estoque consolidado por item."""
    return list_stock_summary(db)


@router.get("/stock-alerts", response_model=list[StockAlertResponse])
def list_stock_alerts_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista apenas itens abaixo do estoque mínimo."""
    return list_stock_alerts(db)
