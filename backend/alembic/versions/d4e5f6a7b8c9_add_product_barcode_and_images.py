"""add product barcode and governed images

Revision ID: d4e5f6a7b8c9
Revises: b7c9d1e2f3a4
Create Date: 2026-08-20 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "b7c9d1e2f3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add optional barcode and one persistent image per stock product."""
    op.add_column(
        "items",
        sa.Column("barcode", sa.String(length=32), nullable=True),
    )
    op.create_index(
        op.f("ix_items_barcode"),
        "items",
        ["barcode"],
        unique=True,
    )

    op.create_table(
        "item_images",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("content", mysql.MEDIUMBLOB(), nullable=False),
        sa.Column("mime_type", sa.String(length=50), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=False),
        sa.Column("source_url", sa.String(length=600), nullable=True),
        sa.Column("attribution", sa.String(length=255), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["item_id"], ["items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_item_images_id"), "item_images", ["id"], unique=False)
    op.create_index(
        op.f("ix_item_images_item_id"),
        "item_images",
        ["item_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_item_images_sha256"),
        "item_images",
        ["sha256"],
        unique=False,
    )
    op.create_index(
        op.f("ix_item_images_created_by_user_id"),
        "item_images",
        ["created_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove governed product images and optional barcode."""
    op.drop_index(
        op.f("ix_item_images_created_by_user_id"),
        table_name="item_images",
    )
    op.drop_index(op.f("ix_item_images_sha256"), table_name="item_images")
    op.drop_index(op.f("ix_item_images_item_id"), table_name="item_images")
    op.drop_index(op.f("ix_item_images_id"), table_name="item_images")
    op.drop_table("item_images")
    op.drop_index(op.f("ix_items_barcode"), table_name="items")
    op.drop_column("items", "barcode")
