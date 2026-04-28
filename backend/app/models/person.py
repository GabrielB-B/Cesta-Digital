from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class Person(TimestampMixin, Base):
    __tablename__ = "people"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(ForeignKey("families.id"), nullable=False, index=True)

    full_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    kinship: Mapped[str] = mapped_column(String(50), nullable=False)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)

    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    education_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_currently_studying: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_currently_working: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    occupation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    individual_income: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    has_disability: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_chronic_illness: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_pregnant: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_nursing_mother: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_family_responsible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    family: Mapped["Family"] = relationship(back_populates="people")

    benefits: Mapped[list["Benefit"]] = relationship(
        back_populates="person",
    )
