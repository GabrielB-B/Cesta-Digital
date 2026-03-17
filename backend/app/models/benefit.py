from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class Benefit(TimestampMixin, Base):
    __tablename__ = "benefits"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(ForeignKey("families.id"), nullable=False, index=True)
    person_id: Mapped[int | None] = mapped_column(ForeignKey("people.id"), nullable=True, index=True)

    benefit_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    monthly_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    counts_as_income: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    family: Mapped["Family"] = relationship(back_populates="benefits")
    person: Mapped["Person | None"] = relationship(back_populates="benefits")