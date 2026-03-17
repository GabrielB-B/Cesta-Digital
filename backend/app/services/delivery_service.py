from sqlalchemy import case, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from fastapi import HTTPException

from app.models.basket_type import BasketType
from app.models.basket_type_item import BasketTypeItem
from app.models.delivery import Delivery
from app.models.delivery_schedule import DeliverySchedule
from app.models.family import Family
from app.models.item import Item
from app.models.stock_batch import StockBatch
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.schemas.delivery import DeliveryFromScheduleCreate, DeliveryScheduleCreate


def _require_user_id(current_user: User) -> int:
    user_id = getattr(current_user, "id", None)
    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Usuario autenticado invalido.",
        )
    return user_id


def create_delivery_schedule(
    db: Session,
    payload: DeliveryScheduleCreate,
    current_user: User,
) -> DeliverySchedule:
    """Cria um agendamento de entrega para uma familia."""
    user_id = _require_user_id(current_user)

    family = db.get(Family, payload.family_id)
    if family is None:
        raise HTTPException(status_code=404, detail="Familia nao encontrada.")

    basket_type = db.get(BasketType, payload.basket_type_id)
    if basket_type is None:
        raise HTTPException(status_code=404, detail="Tipo de cesta nao encontrado.")

    schedule = DeliverySchedule(
        family_id=payload.family_id,
        basket_type_id=payload.basket_type_id,
        scheduled_date=payload.scheduled_date,
        status=payload.status,
        notes=payload.notes,
        created_by_user_id=user_id,
    )

    db.add(schedule)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Nao foi possivel criar o agendamento. Verifique os dados enviados.",
        ) from exc
    db.refresh(schedule)
    return schedule


def list_delivery_schedules(db: Session) -> list[DeliverySchedule]:
    """Lista os agendamentos de entrega cadastrados."""
    stmt = select(DeliverySchedule).order_by(DeliverySchedule.id.desc())
    return list(db.scalars(stmt).all())


def list_deliveries(db: Session) -> list[Delivery]:
    """Lista as entregas registradas."""
    stmt = select(Delivery).order_by(Delivery.id.desc())
    return list(db.scalars(stmt).all())


def _get_recipe_with_stock(db: Session, basket_type_id: int) -> list[dict]:
    """Retorna a receita da cesta com o estoque consolidado atual por item."""
    stmt = (
        select(
            BasketTypeItem.item_id,
            BasketTypeItem.required_quantity,
            Item.name.label("item_name"),
            func.coalesce(func.sum(StockBatch.current_quantity), 0).label(
                "available_quantity"
            ),
        )
        .join(Item, Item.id == BasketTypeItem.item_id)
        .outerjoin(StockBatch, StockBatch.item_id == BasketTypeItem.item_id)
        .where(BasketTypeItem.basket_type_id == basket_type_id)
        .group_by(
            BasketTypeItem.item_id,
            BasketTypeItem.required_quantity,
            Item.name,
        )
    )

    rows = db.execute(stmt).all()

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="Este tipo de cesta nao possui receita cadastrada.",
        )

    recipe: list[dict] = []
    for row in rows:
        recipe.append(
            {
                "item_id": row.item_id,
                "item_name": row.item_name,
                "required_quantity": int(row.required_quantity),
                "available_quantity": int(row.available_quantity or 0),
            }
        )

    return recipe


def _consume_item_from_batches(
    db: Session,
    *,
    delivery: Delivery,
    item_id: int,
    required_quantity: int,
    current_user: User,
) -> None:
    """
    Consome a quantidade necessária de um item distribuindo a baixa
    entre os lotes disponíveis, priorizando validade mais próxima.

    Observação:
    usamos um CASE no order_by para manter lotes sem validade por último
    de forma compatível com MySQL.
    """
    remaining = required_quantity

    stmt = (
        select(StockBatch)
        .where(
            StockBatch.item_id == item_id,
            StockBatch.current_quantity > 0,
        )
        .order_by(
            case((StockBatch.expiration_date.is_(None), 1), else_=0),
            StockBatch.expiration_date.asc(),
            StockBatch.entry_date.asc(),
            StockBatch.id.asc(),
        )
    )

    batches = list(db.scalars(stmt).all())

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
                notes="Baixa automática por entrega de cesta.",
                created_by_user_id=current_user.id,
            )
        )

    if remaining > 0:
        raise HTTPException(
            status_code=400,
            detail="Não foi possível consumir o estoque necessário para a entrega.",
        )


def create_delivery_from_schedule(
    db: Session,
    schedule_id: int,
    payload: DeliveryFromScheduleCreate,
    current_user: User,
) -> Delivery:
    """Conclui uma entrega a partir de um agendamento, baixando estoque automaticamente."""
    user_id = _require_user_id(current_user)

    schedule = db.get(DeliverySchedule, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=404, detail="Agendamento nao encontrado.")

    if (schedule.status or "").strip().lower() != "agendado":
        raise HTTPException(
            status_code=400,
            detail="Somente agendamentos com status 'agendado' podem ser entregues.",
        )

    recipe = _get_recipe_with_stock(db, schedule.basket_type_id)

    for recipe_item in recipe:
        if recipe_item["available_quantity"] < recipe_item["required_quantity"]:
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

    for recipe_item in recipe:
        _consume_item_from_batches(
            db,
            delivery=delivery,
            item_id=recipe_item["item_id"],
            required_quantity=recipe_item["required_quantity"],
            current_user=current_user,
        )

    schedule.status = "retirado"

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Nao foi possivel concluir a entrega. Verifique o estoque e os dados da entrega.",
        ) from exc

    db.refresh(delivery)
    return delivery
