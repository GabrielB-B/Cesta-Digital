from sqlalchemy import ForeignKey, LargeBinary, String
from sqlalchemy.dialects import mysql
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class ItemImage(TimestampMixin, Base):
    """Imagem normalizada e persistente associada a um produto do estoque."""

    __tablename__ = "item_images"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    content: Mapped[bytes] = mapped_column(
        LargeBinary().with_variant(mysql.MEDIUMBLOB(), "mysql"),
        nullable=False,
        deferred=True,
    )
    mime_type: Mapped[str] = mapped_column(String(50), nullable=False)
    size_bytes: Mapped[int] = mapped_column(nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(30), nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    attribution: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    item: Mapped["Item"] = relationship(back_populates="image")
