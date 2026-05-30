"""add church fields to people

Revision ID: 9f2a7b6c8d1e
Revises: 7c8d9e0f1a2b
Create Date: 2026-05-30 23:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f2a7b6c8d1e"
down_revision: Union[str, Sequence[str], None] = "7c8d9e0f1a2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "people",
        sa.Column(
            "attends_church",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "people",
        sa.Column("church_name", sa.String(length=150), nullable=True),
    )
    op.add_column(
        "people",
        sa.Column("church_role", sa.String(length=120), nullable=True),
    )
    op.alter_column(
        "people",
        "attends_church",
        existing_type=sa.Boolean(),
        existing_nullable=False,
        server_default=None,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("people", "church_role")
    op.drop_column("people", "church_name")
    op.drop_column("people", "attends_church")
