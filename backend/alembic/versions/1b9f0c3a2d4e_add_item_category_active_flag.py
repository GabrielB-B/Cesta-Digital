"""add item category active flag

Revision ID: 1b9f0c3a2d4e
Revises: c3a1f5b2c4d8
Create Date: 2026-04-29 19:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "1b9f0c3a2d4e"
down_revision: Union[str, Sequence[str], None] = "c3a1f5b2c4d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "item_categories",
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("item_categories", "is_active")
