from sqlalchemy import Boolean, Text, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class BasketType(TimestampMixin, Base):
    """Tipo de cesta configurável no sistema."""

    __tablename__ = "basket_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    basket_items: Mapped[list["BasketTypeItem"]] = relationship(
        back_populates="basket_type",
        cascade="all, delete-orphan",
    )

    delivery_schedules: Mapped[list["DeliverySchedule"]] = relationship(
        back_populates="basket_type",
    )

    deliveries: Mapped[list["Delivery"]] = relationship(
        back_populates="basket_type",
    )