from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class StockBatch(TimestampMixin, Base):
    """Representa um lote de entrada de item no estoque."""

    __tablename__ = "stock_batches"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("items.id"),
        nullable=False,
        index=True,
    )

    source_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    entry_quantity: Mapped[int] = mapped_column(nullable=False)
    current_quantity: Mapped[int] = mapped_column(nullable=False)

    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiration_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    estimated_unit_value: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    item: Mapped["Item"] = relationship(back_populates="stock_batches")

    movements: Mapped[list["StockMovement"]] = relationship(
        back_populates="batch",
    )