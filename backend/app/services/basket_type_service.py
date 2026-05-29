from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.basket_type import BasketType
from app.models.basket_type_item import BasketTypeItem
from app.models.item import Item
from app.models.user import User
from app.schemas.basket_type import (
    BasketTypeCreate,
    BasketTypeItemCreate,
    BasketTypeItemUpdate,
    BasketTypeUpdate,
)
from app.services.audit_log_service import record_audit_log


def create_basket_type(
    db: Session,
    payload: BasketTypeCreate,
    current_user: User,
) -> BasketType:
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
    db.flush()
    record_audit_log(
        db,
        event_type="basket_type.created",
        actor_user=current_user,
        entity_type="basket_type",
        entity_id=basket_type.id,
        details={
            "name": basket_type.name,
            "is_active": basket_type.is_active,
        },
    )
    db.commit()
    db.refresh(basket_type)
    return get_basket_type_detail(db, basket_type.id)


def list_basket_types(
    db: Session,
    *,
    q: str | None = None,
    is_active: bool | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[BasketType], int]:
    """Lista todos os tipos de cesta cadastrados."""
    filters = []
    search_term = (q or "").strip()
    if search_term:
        normalized_term = f"%{search_term.lower()}%"
        filters.append(
            or_(
                func.lower(BasketType.name).like(normalized_term),
                func.lower(BasketType.notes).like(normalized_term),
            )
        )

    if is_active is not None:
        filters.append(BasketType.is_active.is_(is_active))

    total_stmt = select(func.count(BasketType.id))
    stmt = (
        select(BasketType)
        .options(
            selectinload(BasketType.basket_items).selectinload(BasketTypeItem.item)
        )
        .order_by(BasketType.name.asc())
    )

    if filters:
        total_stmt = total_stmt.where(*filters)
        stmt = stmt.where(*filters)

    total = db.scalar(total_stmt) or 0

    if limit is not None:
        stmt = stmt.offset(offset).limit(limit)

    return list(db.scalars(stmt).all()), total


def update_basket_type(
    db: Session,
    basket_type_id: int,
    payload: BasketTypeUpdate,
    current_user: User,
) -> BasketType:
    """Atualiza um tipo de cesta e permite sua inativacao."""
    basket_type = get_basket_type_detail(db, basket_type_id)

    existing_basket_type = db.scalar(
        select(BasketType).where(
            BasketType.id != basket_type_id,
            BasketType.name == payload.name,
        )
    )
    if existing_basket_type is not None:
        raise HTTPException(
            status_code=409,
            detail="Ja existe um tipo de cesta com esse nome.",
        )

    previous_state = {
        "name": basket_type.name,
        "is_active": basket_type.is_active,
        "notes": basket_type.notes,
    }

    basket_type.name = payload.name
    basket_type.is_active = payload.is_active
    basket_type.notes = payload.notes

    record_audit_log(
        db,
        event_type="basket_type.updated",
        actor_user=current_user,
        entity_type="basket_type",
        entity_id=basket_type.id,
        details={
            "previous": previous_state,
            "current": {
                "name": basket_type.name,
                "is_active": basket_type.is_active,
                "notes": basket_type.notes,
            },
        },
    )
    db.commit()
    db.refresh(basket_type)
    return get_basket_type_detail(db, basket_type.id)


def add_item_to_basket_type(
    db: Session,
    basket_type_id: int,
    payload: BasketTypeItemCreate,
    current_user: User,
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
    db.flush()
    record_audit_log(
        db,
        event_type="basket_type.recipe_item.created",
        actor_user=current_user,
        entity_type="basket_type_item",
        entity_id=basket_item.id,
        details={
            "basket_type_id": basket_type_id,
            "item_id": basket_item.item_id,
            "required_quantity": basket_item.required_quantity,
        },
    )
    db.commit()
    db.refresh(basket_item)
    return basket_item


def update_basket_type_item(
    db: Session,
    basket_type_id: int,
    item_id: int,
    payload: BasketTypeItemUpdate,
    current_user: User,
) -> BasketTypeItem:
    """Atualiza a quantidade exigida de um item da receita."""
    basket_item = db.scalar(
        select(BasketTypeItem).where(
            BasketTypeItem.basket_type_id == basket_type_id,
            BasketTypeItem.item_id == item_id,
        )
    )
    if basket_item is None:
        raise HTTPException(
            status_code=404,
            detail="Item da receita nao encontrado.",
        )

    previous_quantity = basket_item.required_quantity
    basket_item.required_quantity = payload.required_quantity

    record_audit_log(
        db,
        event_type="basket_type.recipe_item.updated",
        actor_user=current_user,
        entity_type="basket_type_item",
        entity_id=basket_item.id,
        details={
            "basket_type_id": basket_type_id,
            "item_id": item_id,
            "previous_quantity": previous_quantity,
            "required_quantity": basket_item.required_quantity,
        },
    )
    db.commit()
    db.refresh(basket_item)
    return basket_item


def delete_basket_type_item(
    db: Session,
    basket_type_id: int,
    item_id: int,
    current_user: User,
) -> None:
    """Remove um item da receita do tipo de cesta."""
    basket_item = db.scalar(
        select(BasketTypeItem).where(
            BasketTypeItem.basket_type_id == basket_type_id,
            BasketTypeItem.item_id == item_id,
        )
    )
    if basket_item is None:
        raise HTTPException(
            status_code=404,
            detail="Item da receita nao encontrado.",
        )

    details = {
        "basket_type_id": basket_type_id,
        "item_id": item_id,
        "required_quantity": basket_item.required_quantity,
    }
    db.delete(basket_item)
    record_audit_log(
        db,
        event_type="basket_type.recipe_item.deleted",
        actor_user=current_user,
        entity_type="basket_type_item",
        entity_id=basket_item.id,
        details=details,
    )
    db.commit()


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
