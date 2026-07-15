from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.benefit import Benefit
from app.models.item import Item
from app.models.item_category import ItemCategory
from app.models.stock_batch import StockBatch
from app.models.stock_movement import StockMovement
from app.services.stock_availability_policy import (
    usable_stock_batch_condition,
    usable_stock_batch_join_condition,
)


NEGATIVE_MOVEMENTS = {"saida_manual", "perda_validade", "ajuste_negativo", "saida_entrega"}
POSITIVE_MOVEMENTS = {"ajuste_positivo"}


def _to_decimal(value) -> Decimal:
    """Converte valores numéricos do banco para Decimal com fallback seguro."""
    return Decimal(value or 0)


def get_financial_summary(db: Session) -> dict:
    """
    Retorna um resumo financeiro estimado do sistema.

    Observações:
    - o valor em estoque usa current_quantity * estimated_unit_value
    - entradas usam entry_quantity * estimated_unit_value
    - saídas usam quantity * estimated_unit_value do lote movimentado
    - benefícios ativos são somados à parte como informação social/financeira
    """
    stock_value_stmt = (
        select(
            func.coalesce(
                func.sum(StockBatch.current_quantity * StockBatch.estimated_unit_value),
                0,
            )
        )
        .select_from(StockBatch)
        .join(Item, Item.id == StockBatch.item_id)
        .where(usable_stock_batch_condition())
    )
    estimated_total_stock_value = _to_decimal(db.scalar(stock_value_stmt))

    entries_value_stmt = select(
        func.coalesce(
            func.sum(StockBatch.entry_quantity * StockBatch.estimated_unit_value),
            0,
        )
    )
    estimated_total_entries_value = _to_decimal(db.scalar(entries_value_stmt))

    output_value_stmt = (
        select(
            func.coalesce(
                func.sum(StockMovement.quantity * StockBatch.estimated_unit_value),
                0,
            )
        )
        .join(StockBatch, StockBatch.id == StockMovement.batch_id)
        .where(StockMovement.movement_type.in_(NEGATIVE_MOVEMENTS))
    )
    estimated_total_output_value = _to_decimal(db.scalar(output_value_stmt))

    active_benefits_stmt = select(
        func.coalesce(func.sum(Benefit.monthly_amount), 0)
    ).where(
        Benefit.is_active.is_(True)
    )
    active_benefits_total_value = _to_decimal(db.scalar(active_benefits_stmt))

    categories_stmt = (
        select(
            ItemCategory.id.label("category_id"),
            ItemCategory.name.label("category_name"),
            func.coalesce(
                func.sum(StockBatch.current_quantity * StockBatch.estimated_unit_value),
                0,
            ).label("estimated_stock_value"),
        )
        .join(Item, Item.category_id == ItemCategory.id)
        .outerjoin(StockBatch, usable_stock_batch_join_condition(Item.id))
        .group_by(ItemCategory.id, ItemCategory.name)
        .order_by(ItemCategory.name.asc())
    )

    category_rows = db.execute(categories_stmt).all()

    categories = [
        {
            "category_id": row.category_id,
            "category_name": row.category_name,
            "estimated_stock_value": _to_decimal(row.estimated_stock_value),
        }
        for row in category_rows
    ]

    return {
        "estimated_total_stock_value": estimated_total_stock_value,
        "estimated_total_entries_value": estimated_total_entries_value,
        "estimated_total_output_value": estimated_total_output_value,
        "active_benefits_total_value": active_benefits_total_value,
        "categories": categories,
    }
