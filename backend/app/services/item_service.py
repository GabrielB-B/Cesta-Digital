from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.item import Item
from app.models.item_category import ItemCategory
from app.schemas.item import ItemCreate


def create_item(db: Session, payload: ItemCreate) -> Item:
    """Cria um item vinculado a uma categoria existente."""
    category = db.get(ItemCategory, payload.category_id)
    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Categoria de item não encontrada.",
        )

    existing_item = db.scalar(
        select(Item).where(
            Item.category_id == payload.category_id,
            Item.name == payload.name,
        )
    )
    if existing_item is not None:
        raise HTTPException(
            status_code=409,
            detail="Já existe um item com esse nome nesta categoria.",
        )

    item = Item(
        category_id=payload.category_id,
        name=payload.name,
        unit_measure=payload.unit_measure,
        tracks_expiration=payload.tracks_expiration,
        is_active=payload.is_active,
        reference_unit_value=payload.reference_unit_value,
        minimum_stock_alert=payload.minimum_stock_alert,
        notes=payload.notes,
    )

    db.add(item)
    db.commit()
    db.refresh(item)
    return get_item_detail(db, item.id)


def list_items(db: Session) -> list[Item]:
    """Lista todos os itens cadastrados com categoria carregada."""
    stmt = (
        select(Item)
        .options(joinedload(Item.category))
        .order_by(Item.name.asc())
    )
    return list(db.scalars(stmt).all())


def get_item_detail(db: Session, item_id: int) -> Item:
    """Busca o detalhe de um item específico."""
    stmt = (
        select(Item)
        .options(joinedload(Item.category))
        .where(Item.id == item_id)
    )
    item = db.scalar(stmt)

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Item não encontrado.",
        )

    return item