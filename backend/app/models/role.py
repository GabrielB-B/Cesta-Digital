from typing import List

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin


class Role(TimestampMixin, Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    user_roles: Mapped[List["UserRole"]] = relationship(
        back_populates="role",
        cascade="all, delete-orphan",
    )