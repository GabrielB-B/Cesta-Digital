from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


ALLOWED_SCHEDULE_STATUSES = {"agendado", "cancelado", "faltou", "reagendado"}
ALLOWED_DELIVERY_STATUSES = {"concluida"}

DeliveryOperationsPeriod = Literal["hoje", "amanha", "semana", "todos"]
DeliveryOperationsStatus = Literal[
    "agendado",
    "reagendado",
    "retirado",
    "ocorrencia",
]


class DeliveryScheduleCreate(BaseModel):
    """Payload para criação de agendamento de entrega."""

    family_id: int
    basket_type_id: int
    scheduled_date: date
    status: str = "agendado"
    notes: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in ALLOWED_SCHEDULE_STATUSES:
            raise ValueError("Status de agendamento inválido.")
        return value


class DeliveryScheduleResponse(BaseModel):
    """Resposta serializada de agendamento de entrega."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    family_id: int
    basket_type_id: int
    scheduled_date: date
    status: str
    notes: str | None
    created_by_user_id: int


class DeliveryOperationItemResponse(BaseModel):
    """Projeção operacional enriquecida para a agenda de entregas."""

    id: int
    family_id: int
    family_code: str
    family_status: str
    basket_type_id: int
    basket_type_name: str
    scheduled_date: date
    status: str
    notes: str | None
    street: str
    number: str
    complement: str | None
    neighborhood: str
    city: str
    state: str


class DeliveryOperationsSummaryResponse(BaseModel):
    """Contadores globais do período, independentes da página atual."""

    scheduled: int
    rescheduled: int
    completed: int
    exceptions: int
    total: int


class DeliveryOperationsResponse(BaseModel):
    items: list[DeliveryOperationItemResponse]
    total: int
    limit: int
    offset: int
    reference_date: date
    period: DeliveryOperationsPeriod
    summary: DeliveryOperationsSummaryResponse


class DeliveryScheduleUpdate(BaseModel):
    scheduled_date: date
    status: str
    notes: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in ALLOWED_SCHEDULE_STATUSES:
            raise ValueError("Status de agendamento invalido.")
        return value


class DeliveryFromScheduleCreate(BaseModel):
    """Payload para confirmar entrega a partir de um agendamento."""

    delivery_date: datetime
    status: str = "concluida"
    notes: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in ALLOWED_DELIVERY_STATUSES:
            raise ValueError("Status de entrega inválido.")
        return value


class DeliveryTraceItemResponse(BaseModel):
    """Item e lote efetivamente consumidos por uma entrega."""

    movement_id: int
    item_id: int
    item_name: str
    unit_measure: str
    batch_id: int
    batch_code: str | None
    batch_status: str
    storage_location: str | None
    expiration_date: date | None
    quantity: int


class DeliveryResponse(BaseModel):
    """Resposta serializada de entrega."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    delivery_schedule_id: int | None
    family_id: int
    basket_type_id: int
    delivery_date: datetime
    delivered_by_user_id: int
    status: str
    notes: str | None
    items: list[DeliveryTraceItemResponse] = Field(default_factory=list)
