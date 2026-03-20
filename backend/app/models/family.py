from decimal import Decimal
from typing import List

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


from decimal import Decimal
from typing import List

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class Family(TimestampMixin, Base):
    """Representa uma família acompanhada pelo sistema."""

    __tablename__ = "families"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    internal_code: Mapped[str] = mapped_column(String(30), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)

    registration_date: Mapped[Date] = mapped_column(Date, nullable=False)
    last_evaluation_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    next_revaluation_date: Mapped[Date | None] = mapped_column(Date, nullable=True)

    monthly_income_total: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    monthly_essential_expenses: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    income_per_capita: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    receives_government_assistance: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    housing_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    has_water_supply: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_electricity: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_sanitation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    rooms_count: Mapped[int] = mapped_column(nullable=False, default=0)
    bedrooms_count: Mapped[int] = mapped_column(nullable=False, default=0)

    zip_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    street: Mapped[str] = mapped_column(String(120), nullable=False)
    number: Mapped[str] = mapped_column(String(20), nullable=False)
    complement: Mapped[str | None] = mapped_column(String(120), nullable=True)
    neighborhood: Mapped[str] = mapped_column(String(120), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str] = mapped_column(String(2), nullable=False)
    reference_point: Mapped[str | None] = mapped_column(String(255), nullable=True)

    total_residents: Mapped[int] = mapped_column(nullable=False, default=1)
    total_adults: Mapped[int] = mapped_column(nullable=False, default=0)
    total_children: Mapped[int] = mapped_column(nullable=False, default=0)
    total_elderly: Mapped[int] = mapped_column(nullable=False, default=0)
    total_babies: Mapped[int] = mapped_column(nullable=False, default=0)

    has_pregnant_member: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_disabled_member: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_chronic_illness_member: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_unemployed_member: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    needs_extra_support: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    attends_church: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    church_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    community_relationship: Mapped[str | None] = mapped_column(String(50), nullable=True)
    responsible_education_level: Mapped[str | None] = mapped_column(String(80), nullable=True)
    has_internet_access: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_mobile_phone: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_computer: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    social_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    updated_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    contacts: Mapped[list["FamilyContact"]] = relationship(
        back_populates="family",
        cascade="all, delete-orphan",
    )

    people: Mapped[list["Person"]] = relationship(
        back_populates="family",
        cascade="all, delete-orphan",
    )

    benefits: Mapped[list["Benefit"]] = relationship(
        back_populates="family",
        cascade="all, delete-orphan",
    )

    assessments: Mapped[list["SocialAssessment"]] = relationship(
        back_populates="family",
        cascade="all, delete-orphan",
    )

    delivery_schedules: Mapped[list["DeliverySchedule"]] = relationship(
        back_populates="family",
        cascade="all, delete-orphan",
    )

    deliveries: Mapped[list["Delivery"]] = relationship(
        back_populates="family",
        cascade="all, delete-orphan",
    )