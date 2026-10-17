from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class BasketTypeItem(TimestampMixin, Base):
    """Item que compõe a receita de um tipo de cesta."""

    __tablename__ = "basket_type_items"
    __table_args__ = (
        UniqueConstraint(
            "basket_type_id",
            "item_id",
            name="uq_basket_type_items_basket_type_id_item_id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    basket_type_id: Mapped[int] = mapped_column(
        ForeignKey("basket_types.id"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[int] = mapped_column(
        ForeignKey("items.id"),
        nullable=False,
        index=True,
    )
    required_quantity: Mapped[int] = mapped_column(nullable=False)

    basket_type: Mapped["BasketType"] = relationship(back_populates="basket_items")
    item: Mapped["Item"] = relationship(back_populates="basket_type_items")

    @property
    def item_name(self) -> str:
        """Retorna o nome do item para respostas detalhadas da receita."""
        return self.item.name

    @property
    def unit_measure(self) -> str:
        """Retorna a unidade de medida do item da receita."""
        return self.item.unit_measure

    @property
    def category_name(self) -> str:
        return self.item.category_name

    @property
    def tracks_expiration(self) -> bool:
        return self.item.tracks_expiration

    @property
    def reference_unit_value(self):
        return self.item.reference_unit_value

    @property
    def image_path(self) -> str | None:
        return self.item.image_path

    @property
    def image_source(self) -> str | None:
        return self.item.image_source

    @property
    def image_attribution(self) -> str | None:
        return self.item.image_attribution
