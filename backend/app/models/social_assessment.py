from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class SocialAssessment(TimestampMixin, Base):
    """Histórico de avaliações sociais de uma família."""

    __tablename__ = "social_assessments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(ForeignKey("families.id"), nullable=False, index=True)

    assessment_date: Mapped[date] = mapped_column(Date, nullable=False)

    monthly_income_total_at_time: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
    )
    income_per_capita_at_time: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
    )

    vulnerability_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    system_suggestion: Mapped[str] = mapped_column(String(30), nullable=False)
    final_decision: Mapped[str] = mapped_column(String(30), nullable=False)

    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    exception_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    approved_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    co_approved_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    next_revaluation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    technical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    family: Mapped["Family"] = relationship(back_populates="assessments")