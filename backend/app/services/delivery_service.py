from collections import defaultdict

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.basket_type import BasketType
from app.models.basket_type_item import BasketTypeItem
from app.models.delivery import Delivery
from app.models.delivery_schedule import DeliverySchedule
from app.models.family import Family
from app.models.item import Item
from app.models.stock_batch import StockBatch
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.schemas.delivery import (
    DeliveryFromScheduleCreate,
    DeliveryScheduleCreate,
    DeliveryScheduleUpdate,
)
from app.services.audit_log_service import record_audit_log
from app.services.stock_availability_policy import (
    stock_batch_fefo_ordering,
    usable_stock_batch_condition,
)


def _require_user_id(current_user: User) -> int:
    user_id = getattr(current_user, "id", None)
    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Usuario autenticado invalido.",
        )
    return user_id


def _validate_family_can_receive_delivery(family: Family) -> None:
    if family.status in {"inativa", "inapta"}:
        raise HTTPException(
            status_code=400,
            detail="Familias inativas ou inaptas nao podem receber agendamentos.",
        )


def _validate_basket_type_can_be_scheduled(basket_type: BasketType) -> None:
    if not basket_type.is_active:
        raise HTTPException(
            status_code=400,
            detail="Tipos de cesta inativos nao podem ser agendados.",
        )


def create_delivery_schedule(
    db: Session,
    payload: DeliveryScheduleCreate,
    current_user: User,
) -> DeliverySchedule:
    user_id = _require_user_id(current_user)

    family = db.get(Family, payload.family_id)
    if family is None:
        raise HTTPException(status_code=404, detail="Familia nao encontrada.")
    _validate_family_can_receive_delivery(family)

    basket_type = db.get(BasketType, payload.basket_type_id)
    if basket_type is None:
        raise HTTPException(status_code=404, detail="Tipo de cesta nao encontrado.")
    _validate_basket_type_can_be_scheduled(basket_type)

    schedule = DeliverySchedule(
        family_id=payload.family_id,
        basket_type_id=payload.basket_type_id,
        scheduled_date=payload.scheduled_date,
        status=payload.status,
        notes=payload.notes,
        created_by_user_id=user_id,
    )

    try:
        db.add(schedule)
        db.flush()
        record_audit_log(
            db,
            event_type="delivery.schedule.created",
            actor_user=current_user,
            entity_type="delivery_schedule",
            entity_id=schedule.id,
            details={
                "family_id": schedule.family_id,
                "basket_type_id": schedule.basket_type_id,
                "scheduled_date": schedule.scheduled_date.isoformat(),
                "status": schedule.status,
            },
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Nao foi possivel criar o agendamento. Verifique os dados enviados.",
        ) from exc
    db.refresh(schedule)
    return schedule


def list_delivery_schedules(
    db: Session,
    *,
    status: str | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[DeliverySchedule], int]:
    total_stmt = select(func.count(DeliverySchedule.id))
    stmt = select(DeliverySchedule).order_by(DeliverySchedule.id.desc())

    if status:
        normalized_status = status.strip().lower()
        total_stmt = total_stmt.where(DeliverySchedule.status == normalized_status)
        stmt = stmt.where(DeliverySchedule.status == normalized_status)

    total = db.scalar(total_stmt) or 0

    if limit is not None:
        stmt = stmt.offset(offset).limit(limit)

    return list(db.scalars(stmt).all()), total


def list_deliveries(
    db: Session,
    *,
    family_id: int | None = None,
    status: str | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[Delivery], int]:
    filters = []
    if family_id is not None:
        filters.append(Delivery.family_id == family_id)
    if status:
        filters.append(Delivery.status == status.strip().lower())

    total_stmt = select(func.count(Delivery.id))
    stmt = select(Delivery).order_by(Delivery.id.desc())

    if filters:
        total_stmt = total_stmt.where(*filters)
        stmt = stmt.where(*filters)

    total = db.scalar(total_stmt) or 0

    if limit is not None:
        stmt = stmt.offset(offset).limit(limit)

    return list(db.scalars(stmt).all()), total


def update_delivery_schedule(
    db: Session,
    schedule_id: int,
    payload: DeliveryScheduleUpdate,
    current_user: User,
) -> DeliverySchedule:
    schedule = db.scalar(
        select(DeliverySchedule)
        .where(DeliverySchedule.id == schedule_id)
        .with_for_update()
    )
    if schedule is None:
        raise HTTPException(status_code=404, detail="Agendamento nao encontrado.")

    if schedule.status == "retirado":
        raise HTTPException(
            status_code=400,
            detail="Agendamentos ja retirados nao podem ser alterados.",
        )

    family = db.get(Family, schedule.family_id)
    if family is None:
        raise HTTPException(status_code=404, detail="Familia nao encontrada.")
    basket_type = db.get(BasketType, schedule.basket_type_id)
    if basket_type is None:
        raise HTTPException(status_code=404, detail="Tipo de cesta nao encontrado.")

    if payload.status in {"agendado", "reagendado"}:
        _validate_family_can_receive_delivery(family)
        _validate_basket_type_can_be_scheduled(basket_type)

    previous_state = {
        "scheduled_date": schedule.scheduled_date.isoformat(),
        "status": schedule.status,
        "notes": schedule.notes,
    }

    schedule.scheduled_date = payload.scheduled_date
    schedule.status = payload.status
    schedule.notes = payload.notes

    record_audit_log(
        db,
        event_type="delivery.schedule.updated",
        actor_user=current_user,
        entity_type="delivery_schedule",
        entity_id=schedule.id,
        details={
            "previous": previous_state,
            "current": {
                "scheduled_date": schedule.scheduled_date.isoformat(),
                "status": schedule.status,
                "notes": schedule.notes,
            },
        },
    )
    db.commit()
    db.refresh(schedule)
    return schedule


def _get_recipe_items(db: Session, basket_type_id: int) -> list[dict]:
    stmt = (
        select(
            BasketTypeItem.item_id,
            BasketTypeItem.required_quantity,
            Item.name.label("item_name"),
        )
        .join(Item, Item.id == BasketTypeItem.item_id)
        .where(BasketTypeItem.basket_type_id == basket_type_id)
        .order_by(Item.name.asc(), BasketTypeItem.item_id.asc())
    )

    rows = db.execute(stmt).all()

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="Este tipo de cesta nao possui receita cadastrada.",
        )

    recipe_items: list[dict] = []
    for row in rows:
        recipe_items.append(
            {
                "item_id": row.item_id,
                "item_name": row.item_name,
                "required_quantity": int(row.required_quantity),
            }
        )

    return recipe_items


def _lock_batches_by_item(
    db: Session,
    item_ids: list[int],
) -> dict[int, list[StockBatch]]:
    if not item_ids:
        return {}

    stmt = (
        select(StockBatch)
        .join(Item, Item.id == StockBatch.item_id)
        .where(
            StockBatch.item_id.in_(item_ids),
            usable_stock_batch_condition(),
        )
        .order_by(*stock_batch_fefo_ordering())
        .with_for_update()
    )

    batches = list(db.scalars(stmt).all())
    batches_by_item: dict[int, list[StockBatch]] = defaultdict(list)

    for batch in batches:
        batches_by_item[batch.item_id].append(batch)

    return batches_by_item


def _sum_available_quantity(batches: list[StockBatch]) -> int:
    return sum(int(batch.current_quantity or 0) for batch in batches)


def _consume_item_from_batches(
    *,
    db: Session,
    batches: list[StockBatch],
    delivery: Delivery,
    item_id: int,
    item_name: str,
    required_quantity: int,
    current_user_id: int,
) -> None:
    remaining = required_quantity

    for batch in batches:
        if remaining <= 0:
            break

        quantity_to_take = min(batch.current_quantity, remaining)
        batch.current_quantity -= quantity_to_take
        remaining -= quantity_to_take

        db.add(
            StockMovement(
                batch_id=batch.id,
                item_id=item_id,
                delivery_id=delivery.id,
                movement_type="saida_entrega",
                quantity=quantity_to_take,
                notes="Baixa automatica por entrega de cesta.",
                created_by_user_id=current_user_id,
            )
        )

    if remaining > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Estoque insuficiente para o item '{item_name}'.",
        )


def create_delivery_from_schedule(
    db: Session,
    schedule_id: int,
    payload: DeliveryFromScheduleCreate,
    current_user: User,
) -> Delivery:
    user_id = _require_user_id(current_user)
    delivery: Delivery | None = None

    try:
        schedule = db.scalar(
            select(DeliverySchedule)
            .where(DeliverySchedule.id == schedule_id)
            .with_for_update()
        )
        if schedule is None:
            raise HTTPException(
                status_code=404,
                detail="Agendamento nao encontrado.",
            )

        if (schedule.status or "").strip().lower() != "agendado":
            raise HTTPException(
                status_code=400,
                detail="Somente agendamentos com status 'agendado' podem ser entregues.",
            )

        recipe_items = _get_recipe_items(db, schedule.basket_type_id)
        family = db.get(Family, schedule.family_id)
        if family is None:
            raise HTTPException(status_code=404, detail="Familia nao encontrada.")
        _validate_family_can_receive_delivery(family)

        basket_type = db.get(BasketType, schedule.basket_type_id)
        if basket_type is None:
            raise HTTPException(status_code=404, detail="Tipo de cesta nao encontrado.")
        _validate_basket_type_can_be_scheduled(basket_type)

        item_ids = [item["item_id"] for item in recipe_items]
        batches_by_item = _lock_batches_by_item(db, item_ids)

        for recipe_item in recipe_items:
            available_quantity = _sum_available_quantity(
                batches_by_item.get(recipe_item["item_id"], [])
            )
            if available_quantity < recipe_item["required_quantity"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Estoque insuficiente para o item '{recipe_item['item_name']}'.",
                )

        delivery = Delivery(
            delivery_schedule_id=schedule.id,
            family_id=schedule.family_id,
            basket_type_id=schedule.basket_type_id,
            delivery_date=payload.delivery_date,
            delivered_by_user_id=user_id,
            status=payload.status,
            notes=payload.notes,
        )

        db.add(delivery)
        db.flush()

        for recipe_item in recipe_items:
            _consume_item_from_batches(
                db=db,
                batches=batches_by_item.get(recipe_item["item_id"], []),
                delivery=delivery,
                item_id=recipe_item["item_id"],
                item_name=recipe_item["item_name"],
                required_quantity=recipe_item["required_quantity"],
                current_user_id=user_id,
            )

        schedule.status = "retirado"
        record_audit_log(
            db,
            event_type="delivery.created",
            actor_user=current_user,
            entity_type="delivery",
            entity_id=delivery.id,
            details={
                "family_id": delivery.family_id,
                "basket_type_id": delivery.basket_type_id,
                "delivery_schedule_id": delivery.delivery_schedule_id,
                "status": delivery.status,
            },
        )
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Nao foi possivel concluir a entrega. Verifique o estoque e os dados da entrega.",
        ) from exc

    if delivery is None:
        raise RuntimeError("A entrega nao foi criada.")

    db.refresh(delivery)
    return delivery
