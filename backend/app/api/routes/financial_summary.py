from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.financial_summary import FinancialSummaryResponse
from app.services.financial_summary_service import get_financial_summary

router = APIRouter(tags=["Prestação de Contas"])


@router.get("/financial-summary", response_model=FinancialSummaryResponse)
def get_financial_summary_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Retorna o resumo financeiro inicial do sistema."""
    return get_financial_summary(db)