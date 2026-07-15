from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.basket_type import BasketType
from app.models.basket_type_item import BasketTypeItem
from app.models.item import Item
from app.models.stock_batch import StockBatch
from app.services.stock_availability_policy import usable_stock_batch_join_condition
from fastapi import HTTPException


def get_basket_availability(db: Session, basket_type_id: int) -> dict:
    """
    Calcula quantas cestas completas podem ser formadas com base
    no estoque atual consolidado dos itens da receita.

    Regras:
    - usa current_quantity dos lotes, nunca entry_quantity
    - o número de cestas possíveis é o menor valor inteiro entre
      disponível / necessário para cada item da receita
    - também calcula quanto falta de cada item para formar mais 1 cesta
    """
    basket_type = db.get(BasketType, basket_type_id)
    if basket_type is None:
        raise HTTPException(
            status_code=404,
            detail="Tipo de cesta não encontrado.",
        )

    recipe_stmt = (
        select(
            BasketTypeItem.item_id,
            BasketTypeItem.required_quantity,
            Item.name.label("item_name"),
            Item.unit_measure.label("unit_measure"),
            func.coalesce(func.sum(StockBatch.current_quantity), 0).label("available_quantity"),
        )
        .join(Item, Item.id == BasketTypeItem.item_id)
        .outerjoin(
            StockBatch,
            usable_stock_batch_join_condition(BasketTypeItem.item_id),
        )
        .where(BasketTypeItem.basket_type_id == basket_type_id)
        .group_by(
            BasketTypeItem.item_id,
            BasketTypeItem.required_quantity,
            Item.name,
            Item.unit_measure,
        )
        .order_by(Item.name.asc())
    )

    rows = db.execute(recipe_stmt).all()

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="Este tipo de cesta ainda não possui itens na receita.",
        )

    items_summary = []
    possible_values = []

    for row in rows:
        available_quantity = int(row.available_quantity or 0)
        required_quantity = int(row.required_quantity)
        possible_from_item = available_quantity // required_quantity

        remainder = available_quantity % required_quantity
        missing_for_next_basket = 0 if remainder == 0 and available_quantity >= required_quantity else required_quantity - remainder

        if available_quantity < required_quantity:
            missing_for_next_basket = required_quantity - available_quantity

        items_summary.append(
            {
                "item_id": row.item_id,
                "item_name": row.item_name,
                "unit_measure": row.unit_measure,
                "required_quantity": required_quantity,
                "available_quantity": available_quantity,
                "possible_from_item": possible_from_item,
                "missing_for_next_basket": missing_for_next_basket,
            }
        )

        possible_values.append(possible_from_item)

    possible_baskets = min(possible_values) if possible_values else 0
    limiting_item_ids = [
        item["item_id"]
        for item in items_summary
        if item["possible_from_item"] == possible_baskets
    ]

    return {
        "basket_type_id": basket_type.id,
        "basket_type_name": basket_type.name,
        "possible_baskets": possible_baskets,
        "limiting_item_ids": limiting_item_ids,
        "items": items_summary,
    }
