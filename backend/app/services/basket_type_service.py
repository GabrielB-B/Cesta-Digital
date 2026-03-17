from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.basket_type import BasketType
from app.models.basket_type_item import BasketTypeItem
from app.models.item import Item
from app.schemas.basket_type import BasketTypeCreate, BasketTypeItemCreate


def create_basket_type(db: Session, payload: BasketTypeCreate) -> BasketType:
    """Cria um tipo de cesta evitando duplicidade por nome."""
    existing_basket_type = db.scalar(
        select(BasketType).where(BasketType.name == payload.name)
    )
    if existing_basket_type is not None:
        raise HTTPException(
            status_code=409,
            detail="Já existe um tipo de cesta com esse nome.",
        )

    basket_type = BasketType(
        name=payload.name,
        is_active=payload.is_active,
        notes=payload.notes,
    )

    db.add(basket_type)
    db.commit()
    db.refresh(basket_type)
    return get_basket_type_detail(db, basket_type.id)


def list_basket_types(db: Session) -> list[BasketType]:
    """Lista todos os tipos de cesta cadastrados."""
    stmt = (
        select(BasketType)
        .options(
            selectinload(BasketType.basket_items).selectinload(BasketTypeItem.item)
        )
        .order_by(BasketType.name.asc())
    )
    return list(db.scalars(stmt).all())


def add_item_to_basket_type(
    db: Session,
    basket_type_id: int,
    payload: BasketTypeItemCreate,
) -> BasketTypeItem:
    """Adiciona um item à receita de um tipo de cesta."""
    basket_type = db.get(BasketType, basket_type_id)
    if basket_type is None:
        raise HTTPException(
            status_code=404,
            detail="Tipo de cesta não encontrado.",
        )

    item = db.get(Item, payload.item_id)
    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Item não encontrado.",
        )

    existing_recipe_item = db.scalar(
        select(BasketTypeItem).where(
            BasketTypeItem.basket_type_id == basket_type_id,
            BasketTypeItem.item_id == payload.item_id,
        )
    )
    if existing_recipe_item is not None:
        raise HTTPException(
            status_code=409,
            detail="Este item já foi adicionado a este tipo de cesta.",
        )

    basket_item = BasketTypeItem(
        basket_type_id=basket_type_id,
        item_id=payload.item_id,
        required_quantity=payload.required_quantity,
    )

    db.add(basket_item)
    db.commit()
    db.refresh(basket_item)
    return basket_item


def list_basket_type_items(db: Session, basket_type_id: int) -> list[BasketTypeItem]:
    """Lista os itens da receita de um tipo de cesta."""
    basket_type = db.get(BasketType, basket_type_id)
    if basket_type is None:
        raise HTTPException(
            status_code=404,
            detail="Tipo de cesta não encontrado.",
        )

    stmt = (
        select(BasketTypeItem)
        .where(BasketTypeItem.basket_type_id == basket_type_id)
        .order_by(BasketTypeItem.id.asc())
    )
    return list(db.scalars(stmt).all())


def get_basket_type_detail(db: Session, basket_type_id: int) -> BasketType:
    """Busca o detalhe de um tipo de cesta com sua receita."""
    stmt = (
        select(BasketType)
        .options(
            selectinload(BasketType.basket_items).selectinload(BasketTypeItem.item)
        )
        .where(BasketType.id == basket_type_id)
    )

    basket_type = db.scalar(stmt)
    if basket_type is None:
        raise HTTPException(
            status_code=404,
            detail="Tipo de cesta não encontrado.",
        )

    return basket_type