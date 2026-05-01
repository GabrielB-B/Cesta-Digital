from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
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
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    q: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Lista o estoque consolidado por item."""
    summary, total = list_stock_summary(
        db,
        q=q,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    return summary


@router.get("/stock-alerts", response_model=list[StockAlertResponse])
def list_stock_alerts_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista apenas itens abaixo do estoque mínimo."""
    return list_stock_alerts(db)
