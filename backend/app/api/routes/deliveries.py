from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.delivery import (
    DeliveryFromScheduleCreate,
    DeliveryResponse,
    DeliveryScheduleCreate,
    DeliveryScheduleResponse,
    DeliveryScheduleUpdate,
)
from app.services.delivery_service import (
    create_delivery_from_schedule,
    create_delivery_schedule,
    get_delivery_detail,
    list_deliveries,
    list_delivery_schedules,
    update_delivery_schedule,
)

router = APIRouter(
    tags=["Entregas"],
    dependencies=[Depends(require_any_role("admin", "operador"))],
)


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
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    status: str | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Lista os agendamentos cadastrados."""
    schedules, total = list_delivery_schedules(
        db,
        status=status,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    return schedules


@router.put("/delivery-schedules/{schedule_id}", response_model=DeliveryScheduleResponse)
def update_delivery_schedule_endpoint(
    schedule_id: int,
    payload: DeliveryScheduleUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Cancela, reagenda ou atualiza um agendamento ainda nao retirado."""
    return update_delivery_schedule(db, schedule_id, payload, current_user)


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
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    family_id: int | None = Query(default=None, ge=1),
    status: str | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Lista as entregas registradas."""
    deliveries, total = list_deliveries(
        db,
        family_id=family_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    return deliveries


@router.get("/deliveries/{delivery_id}", response_model=DeliveryResponse)
def get_delivery_detail_endpoint(
    delivery_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Exibe a entrega e os itens/lotes efetivamente consumidos."""
    return get_delivery_detail(db, delivery_id)
