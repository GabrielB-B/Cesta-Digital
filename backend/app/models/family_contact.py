from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class FamilyContact(TimestampMixin, Base):
    __tablename__ = "family_contacts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(ForeignKey("families.id"), nullable=False, index=True)

    contact_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    contact_type: Mapped[str] = mapped_column(String(30), nullable=False)
    is_whatsapp: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    family: Mapped["Family"] = relationship(back_populates="contacts")