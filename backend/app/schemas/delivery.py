from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator


ALLOWED_SCHEDULE_STATUSES = {"agendado", "cancelado", "faltou", "reagendado"}
ALLOWED_DELIVERY_STATUSES = {"concluida"}


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
