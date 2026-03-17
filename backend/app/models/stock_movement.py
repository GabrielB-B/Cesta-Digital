from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class StockMovement(TimestampMixin, Base):
    """Representa uma movimentação aplicada sobre um lote de estoque."""

    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    batch_id: Mapped[int] = mapped_column(
        ForeignKey("stock_batches.id"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[int] = mapped_column(
        ForeignKey("items.id"),
        nullable=False,
        index=True,
    )
    delivery_id: Mapped[int | None] = mapped_column(
        ForeignKey("deliveries.id"),
        nullable=True,
        index=True,
    )

    movement_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(nullable=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    batch: Mapped["StockBatch"] = relationship(back_populates="movements")
    item: Mapped["Item"] = relationship(back_populates="stock_movements")