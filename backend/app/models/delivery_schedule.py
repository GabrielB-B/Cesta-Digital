from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class DeliverySchedule(TimestampMixin, Base):
    """Agendamento de retirada/entrega de uma cesta para uma família."""

    __tablename__ = "delivery_schedules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(
        ForeignKey("families.id"),
        nullable=False,
        index=True,
    )
    basket_type_id: Mapped[int] = mapped_column(
        ForeignKey("basket_types.id"),
        nullable=False,
        index=True,
    )

    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    family: Mapped["Family"] = relationship(back_populates="delivery_schedules")
    basket_type: Mapped["BasketType"] = relationship(back_populates="delivery_schedules")
    deliveries: Mapped[list["Delivery"]] = relationship(
        back_populates="delivery_schedule",
    )