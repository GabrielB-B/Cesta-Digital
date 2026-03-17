from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class Delivery(TimestampMixin, Base):
    """Entrega efetivamente realizada para uma família."""

    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    delivery_schedule_id: Mapped[int | None] = mapped_column(
        ForeignKey("delivery_schedules.id"),
        nullable=True,
        index=True,
    )
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

    delivery_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    delivered_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    delivery_schedule: Mapped["DeliverySchedule | None"] = relationship(
        back_populates="deliveries"
    )
    family: Mapped["Family"] = relationship(back_populates="deliveries")
    basket_type: Mapped["BasketType"] = relationship(back_populates="deliveries")