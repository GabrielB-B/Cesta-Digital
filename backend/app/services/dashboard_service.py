from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.basket_type import BasketType
from app.models.basket_type_item import BasketTypeItem
from app.models.delivery import Delivery
from app.models.delivery_schedule import DeliverySchedule
from app.models.family import Family
from app.models.item import Item
from app.models.item_category import ItemCategory
from app.models.stock_batch import StockBatch
from app.services.stock_availability_policy import usable_stock_batch_join_condition
from app.services.stock_summary_service import list_stock_alerts


def _count_families_by_status(db: Session, status: str) -> int:
    """Conta famílias por status específico."""
    stmt = select(func.count(Family.id)).where(Family.status == status)
    return int(db.scalar(stmt) or 0)


def _count_active_families(db: Session) -> int:
    """Conta famílias ativas, desconsiderando as inativas."""
    stmt = select(func.count(Family.id)).where(Family.status != "inativa")
    return int(db.scalar(stmt) or 0)


def _get_upcoming_revaluations(db: Session, days_ahead: int = 30) -> list[dict]:
    """
    Retorna as próximas reavaliações dentro da janela informada.
    """
    today = date.today()
    limit_date = today + timedelta(days=days_ahead)

    stmt = (
        select(
            Family.id,
            Family.internal_code,
            Family.status,
            Family.next_revaluation_date,
        )
        .where(
            Family.next_revaluation_date.is_not(None),
            Family.next_revaluation_date >= today,
            Family.next_revaluation_date <= limit_date,
            Family.status != "inativa",
        )
        .order_by(Family.next_revaluation_date.asc(), Family.id.asc())
        .limit(10)
    )

    rows = db.execute(stmt).all()

    return [
        {
            "family_id": row.id,
            "internal_code": row.internal_code,
            "status": row.status,
            "next_revaluation_date": row.next_revaluation_date,
        }
        for row in rows
    ]


def _calculate_possible_baskets_for_basket_type(db: Session, basket_type_id: int) -> int:
    """
    Calcula quantas cestas de um tipo podem ser montadas com o estoque atual.

    Se a cesta não tiver receita, retorna 0 para o dashboard.
    """
    stmt = (
        select(
            BasketTypeItem.required_quantity,
            func.coalesce(func.sum(StockBatch.current_quantity), 0).label("available_quantity"),
        )
        .join(Item, Item.id == BasketTypeItem.item_id)
        .outerjoin(
            StockBatch,
            usable_stock_batch_join_condition(BasketTypeItem.item_id),
        )
        .where(BasketTypeItem.basket_type_id == basket_type_id)
        .group_by(BasketTypeItem.item_id, BasketTypeItem.required_quantity)
    )

    rows = db.execute(stmt).all()

    if not rows:
        return 0

    possible_values: list[int] = []

    for row in rows:
        required_quantity = int(row.required_quantity)
        available_quantity = int(row.available_quantity or 0)
        possible_values.append(available_quantity // required_quantity)

    return min(possible_values) if possible_values else 0


def _get_basket_summaries(db: Session) -> list[dict]:
    """Monta o resumo de disponibilidade por tipo de cesta ativo."""
    stmt = select(BasketType).where(BasketType.is_active.is_(True)).order_by(BasketType.name.asc())
    basket_types = list(db.scalars(stmt).all())

    summaries = []
    for basket_type in basket_types:
        summaries.append(
            {
                "basket_type_id": basket_type.id,
                "basket_type_name": basket_type.name,
                "possible_baskets": _calculate_possible_baskets_for_basket_type(db, basket_type.id),
            }
        )

    return summaries


def _count_deliveries_this_month(db: Session) -> int:
    """Conta quantas entregas foram feitas no mês atual."""
    now = datetime.now()
    first_day = datetime(now.year, now.month, 1)

    stmt = select(func.count(Delivery.id)).where(Delivery.delivery_date >= first_day)
    return int(db.scalar(stmt) or 0)


def _count_pending_schedules(db: Session) -> int:
    """Conta agendamentos ainda pendentes de retirada."""
    stmt = select(func.count(DeliverySchedule.id)).where(DeliverySchedule.status == "agendado")
    return int(db.scalar(stmt) or 0)


def get_dashboard_overview(db: Session) -> dict:
    """Retorna a visão consolidada inicial do dashboard."""
    total_families_stmt = select(func.count(Family.id))
    total_families = int(db.scalar(total_families_stmt) or 0)

    stock_alerts = list_stock_alerts(db)
    upcoming_revaluations = _get_upcoming_revaluations(db)
    basket_summaries = _get_basket_summaries(db)

    return {
        "total_families": total_families,
        "active_families": _count_active_families(db),
        "recurring_eligible_families": _count_families_by_status(db, "apta_recorrente"),
        "emergency_eligible_families": _count_families_by_status(db, "apta_emergencial"),
        "under_review_families": _count_families_by_status(db, "em_analise"),
        "inactive_families": _count_families_by_status(db, "inativa"),
        "pending_schedules": _count_pending_schedules(db),
        "deliveries_this_month": _count_deliveries_this_month(db),
        "upcoming_revaluations_count": len(upcoming_revaluations),
        "items_below_minimum_count": len(stock_alerts),
        "basket_summaries": basket_summaries,
        "upcoming_revaluations": upcoming_revaluations,
        "stock_alerts": stock_alerts,
    }
