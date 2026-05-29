"""create login rate limits table

Revision ID: 2a4c8d6e9f10
Revises: 1b9f0c3a2d4e
Create Date: 2026-05-11 12:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2a4c8d6e9f10"
down_revision: Union[str, Sequence[str], None] = "1b9f0c3a2d4e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "login_rate_limits",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("bucket_key", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=150), nullable=False),
        sa.Column("client_ip", sa.String(length=64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("window_started_at", sa.DateTime(), nullable=True),
        sa.Column("locked_until", sa.DateTime(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bucket_key"),
    )
    op.create_index(
        op.f("ix_login_rate_limits_bucket_key"),
        "login_rate_limits",
        ["bucket_key"],
        unique=True,
    )
    op.create_index(
        op.f("ix_login_rate_limits_client_ip"),
        "login_rate_limits",
        ["client_ip"],
        unique=False,
    )
    op.create_index(
        op.f("ix_login_rate_limits_email"),
        "login_rate_limits",
        ["email"],
        unique=False,
    )
    op.create_index(
        op.f("ix_login_rate_limits_id"),
        "login_rate_limits",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_login_rate_limits_locked_until"),
        "login_rate_limits",
        ["locked_until"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_login_rate_limits_locked_until"), table_name="login_rate_limits")
    op.drop_index(op.f("ix_login_rate_limits_id"), table_name="login_rate_limits")
    op.drop_index(op.f("ix_login_rate_limits_email"), table_name="login_rate_limits")
    op.drop_index(op.f("ix_login_rate_limits_client_ip"), table_name="login_rate_limits")
    op.drop_index(op.f("ix_login_rate_limits_bucket_key"), table_name="login_rate_limits")
    op.drop_table("login_rate_limits")
