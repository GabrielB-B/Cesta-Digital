from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.item import Item
from app.models.item_category import ItemCategory
from app.models.user import User
from app.schemas.item import ItemCreate, ItemUpdate
from app.services.audit_log_service import record_audit_log


def create_item(db: Session, payload: ItemCreate, current_user: User) -> Item:
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
    db.flush()
    record_audit_log(
        db,
        event_type="item.created",
        actor_user=current_user,
        entity_type="item",
        entity_id=item.id,
        details={
            "category_id": item.category_id,
            "name": item.name,
            "unit_measure": item.unit_measure,
            "is_active": item.is_active,
            "tracks_expiration": item.tracks_expiration,
        },
    )
    db.commit()
    db.refresh(item)
    return get_item_detail(db, item.id)


def list_items(
    db: Session,
    *,
    q: str | None = None,
    is_active: bool | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[Item], int]:
    """Lista todos os itens cadastrados com categoria carregada."""
    filters = []
    search_term = (q or "").strip()
    if search_term:
        normalized_term = f"%{search_term.lower()}%"
        filters.append(
            or_(
                func.lower(Item.name).like(normalized_term),
                func.lower(Item.unit_measure).like(normalized_term),
                func.lower(ItemCategory.name).like(normalized_term),
            )
        )

    if is_active is not None:
        filters.append(Item.is_active.is_(is_active))

    total_stmt = select(func.count(Item.id)).join(ItemCategory)
    stmt = (
        select(Item)
        .options(joinedload(Item.category))
        .join(ItemCategory)
        .order_by(Item.name.asc())
    )

    if filters:
        total_stmt = total_stmt.where(*filters)
        stmt = stmt.where(*filters)

    total = db.scalar(total_stmt) or 0

    if limit is not None:
        stmt = stmt.offset(offset).limit(limit)

    return list(db.scalars(stmt).all()), total


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


def update_item(
    db: Session,
    item_id: int,
    payload: ItemUpdate,
    current_user: User,
) -> Item:
    """Atualiza o cadastro de um item e permite sua inativacao."""
    item = get_item_detail(db, item_id)

    category = db.get(ItemCategory, payload.category_id)
    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Categoria de item nao encontrada.",
        )

    existing_item = db.scalar(
        select(Item).where(
            Item.id != item_id,
            Item.category_id == payload.category_id,
            Item.name == payload.name,
        )
    )
    if existing_item is not None:
        raise HTTPException(
            status_code=409,
            detail="Ja existe um item com esse nome nesta categoria.",
        )

    previous_state = {
        "category_id": item.category_id,
        "name": item.name,
        "unit_measure": item.unit_measure,
        "tracks_expiration": item.tracks_expiration,
        "is_active": item.is_active,
        "reference_unit_value": str(item.reference_unit_value),
        "minimum_stock_alert": item.minimum_stock_alert,
    }

    item.category_id = payload.category_id
    item.name = payload.name
    item.unit_measure = payload.unit_measure
    item.tracks_expiration = payload.tracks_expiration
    item.is_active = payload.is_active
    item.reference_unit_value = payload.reference_unit_value
    item.minimum_stock_alert = payload.minimum_stock_alert
    item.notes = payload.notes

    record_audit_log(
        db,
        event_type="item.updated",
        actor_user=current_user,
        entity_type="item",
        entity_id=item.id,
        details={
            "previous": previous_state,
            "current": {
                "category_id": item.category_id,
                "name": item.name,
                "unit_measure": item.unit_measure,
                "tracks_expiration": item.tracks_expiration,
                "is_active": item.is_active,
                "reference_unit_value": str(item.reference_unit_value),
                "minimum_stock_alert": item.minimum_stock_alert,
            },
        },
    )
    db.commit()
    db.refresh(item)
    return get_item_detail(db, item.id)
