from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.item_category import ItemCategory
from app.models.user import User
from app.schemas.item_category import ItemCategoryCreate, ItemCategoryUpdate
from app.services.audit_log_service import record_audit_log


def create_item_category(
    db: Session,
    payload: ItemCategoryCreate,
    current_user: User,
) -> ItemCategory:
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
        is_active=payload.is_active,
    )

    db.add(category)
    db.flush()
    record_audit_log(
        db,
        event_type="item_category.created",
        actor_user=current_user,
        entity_type="item_category",
        entity_id=category.id,
        details={
            "name": category.name,
            "is_active": category.is_active,
        },
    )
    db.commit()
    db.refresh(category)
    return category


def list_item_categories(
    db: Session,
    *,
    q: str | None = None,
    is_active: bool | None = None,
) -> list[ItemCategory]:
    """Lista todas as categorias de item cadastradas."""
    stmt = select(ItemCategory).order_by(ItemCategory.name.asc())

    filters = []
    search_term = (q or "").strip()
    if search_term:
        normalized_term = f"%{search_term.lower()}%"
        filters.append(
            or_(
                func.lower(ItemCategory.name).like(normalized_term),
                func.lower(ItemCategory.description).like(normalized_term),
            )
        )

    if is_active is not None:
        filters.append(ItemCategory.is_active.is_(is_active))

    if filters:
        stmt = stmt.where(*filters)

    return list(db.scalars(stmt).all())


def update_item_category(
    db: Session,
    category_id: int,
    payload: ItemCategoryUpdate,
    current_user: User,
) -> ItemCategory:
    category = db.get(ItemCategory, category_id)
    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Categoria de item nao encontrada.",
        )

    existing_category = db.scalar(
        select(ItemCategory).where(
            ItemCategory.id != category_id,
            ItemCategory.name == payload.name,
        )
    )
    if existing_category is not None:
        raise HTTPException(
            status_code=409,
            detail="Ja existe uma categoria com esse nome.",
        )

    previous_state = {
        "name": category.name,
        "description": category.description,
        "is_active": category.is_active,
    }

    category.name = payload.name
    category.description = payload.description
    category.is_active = payload.is_active

    record_audit_log(
        db,
        event_type="item_category.updated",
        actor_user=current_user,
        entity_type="item_category",
        entity_id=category.id,
        details={
            "previous": previous_state,
            "current": {
                "name": category.name,
                "description": category.description,
                "is_active": category.is_active,
            },
        },
    )
    db.commit()
    db.refresh(category)
    return category
