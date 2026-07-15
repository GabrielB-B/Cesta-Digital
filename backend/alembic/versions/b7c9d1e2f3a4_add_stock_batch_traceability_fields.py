"""add stock batch traceability fields

Revision ID: b7c9d1e2f3a4
Revises: 9f2a7b6c8d1e
Create Date: 2026-07-15 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c9d1e2f3a4"
down_revision: Union[str, Sequence[str], None] = "9f2a7b6c8d1e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add physical identification and operational control to stock batches."""
    op.add_column(
        "stock_batches",
        sa.Column("batch_code", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "stock_batches",
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="disponivel",
        ),
    )
    op.add_column(
        "stock_batches",
        sa.Column("storage_location", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "stock_batches",
        sa.Column("quarantine_reason", sa.Text(), nullable=True),
    )

    op.create_check_constraint(
        "ck_stock_batches_status",
        "stock_batches",
        "status IN ('disponivel', 'quarentena', 'bloqueado')",
    )
    op.create_index(
        op.f("ix_stock_batches_batch_code"),
        "stock_batches",
        ["batch_code"],
        unique=True,
    )
    op.create_index(
        op.f("ix_stock_batches_status"),
        "stock_batches",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    """Remove stock batch traceability fields."""
    op.drop_index(op.f("ix_stock_batches_status"), table_name="stock_batches")
    op.drop_index(op.f("ix_stock_batches_batch_code"), table_name="stock_batches")
    op.drop_constraint(
        "ck_stock_batches_status",
        "stock_batches",
        type_="check",
    )
    op.drop_column("stock_batches", "quarantine_reason")
    op.drop_column("stock_batches", "storage_location")
    op.drop_column("stock_batches", "status")
    op.drop_column("stock_batches", "batch_code")
