from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class Item(TimestampMixin, Base):
    """Item individual controlado pelo sistema de estoque."""

    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("item_categories.id"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    unit_measure: Mapped[str] = mapped_column(String(20), nullable=False)
    tracks_expiration: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    reference_unit_value: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
    )
    minimum_stock_alert: Mapped[int] = mapped_column(nullable=False, default=0)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    category: Mapped["ItemCategory"] = relationship(back_populates="items")

    stock_batches: Mapped[list["StockBatch"]] = relationship(
        back_populates="item",
    )

    stock_movements: Mapped[list["StockMovement"]] = relationship(
        back_populates="item",
    )

    basket_type_items: Mapped[list["BasketTypeItem"]] = relationship(
        back_populates="item",
    )

    @property
    def category_name(self) -> str:
        """Retorna o nome da categoria para respostas detalhadas do frontend."""
        return self.category.name