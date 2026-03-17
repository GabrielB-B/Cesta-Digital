from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.item_category import ItemCategory
from app.schemas.item_category import ItemCategoryCreate


def create_item_category(db: Session, payload: ItemCategoryCreate) -> ItemCategory:
    """Cria uma categoria de item, evitando duplicidade por nome."""
    existing_category = db.scalar(
        select(ItemCategory).where(ItemCategory.name == payload.name)
    )
    if existing_category is not None:
        raise HTTPException(
            status_code=409,
            detail="Já existe uma categoria com esse nome.",
        )

    category = ItemCategory(
        name=payload.name,
        description=payload.description,
    )

    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def list_item_categories(db: Session) -> list[ItemCategory]:
    """Lista todas as categorias de item cadastradas."""
    stmt = select(ItemCategory).order_by(ItemCategory.name.asc())
    return list(db.scalars(stmt).all())