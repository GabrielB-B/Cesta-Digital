from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.delivery import (
    DeliveryFromScheduleCreate,
    DeliveryResponse,
    DeliveryScheduleCreate,
    DeliveryScheduleResponse,
)
from app.services.delivery_service import (
    create_delivery_from_schedule,
    create_delivery_schedule,
    list_deliveries,
    list_delivery_schedules,
)

router = APIRouter(tags=["Entregas"])


@router.post("/delivery-schedules", response_model=DeliveryScheduleResponse, status_code=201)
def create_delivery_schedule_endpoint(
    payload: DeliveryScheduleCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Cria um novo agendamento de entrega."""
    return create_delivery_schedule(db, payload, current_user)


@router.get("/delivery-schedules", response_model=list[DeliveryScheduleResponse])
def list_delivery_schedules_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista os agendamentos cadastrados."""
    return list_delivery_schedules(db)


@router.post(
    "/deliveries/from-schedule/{schedule_id}",
    response_model=DeliveryResponse,
    status_code=201,
)
def create_delivery_from_schedule_endpoint(
    schedule_id: int,
    payload: DeliveryFromScheduleCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Confirma uma entrega a partir de um agendamento existente."""
    return create_delivery_from_schedule(db, schedule_id, payload, current_user)


@router.get("/deliveries", response_model=list[DeliveryResponse])
def list_deliveries_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Lista as entregas registradas."""
    return list_deliveries(db)