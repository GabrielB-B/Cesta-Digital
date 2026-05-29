"""add login name to users

Revision ID: 7c8d9e0f1a2b
Revises: 2a4c8d6e9f10
Create Date: 2026-05-28 19:45:00.000000

"""
from typing import Sequence, Union
import re

from alembic import op
import sqlalchemy as sa


revision: str = "7c8d9e0f1a2b"
down_revision: Union[str, Sequence[str], None] = "2a4c8d6e9f10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _login_from_email(email: str, user_id: int, used_logins: set[str]) -> str:
    local_part = (email or "").split("@", 1)[0].strip().lower()
    base = re.sub(r"[^a-z0-9._-]+", ".", local_part).strip(".-_")
    if not base:
        base = f"usuario{user_id}"

    candidate = base[:80]
    suffix = 2
    while candidate in used_logins:
        suffix_text = f"-{suffix}"
        candidate = f"{base[: 80 - len(suffix_text)]}{suffix_text}"
        suffix += 1

    used_logins.add(candidate)
    return candidate


def upgrade() -> None:
    op.add_column("users", sa.Column("login_name", sa.String(length=80), nullable=True))

    bind = op.get_bind()
    rows = list(bind.execute(sa.text("SELECT id, email FROM users ORDER BY id")).mappings())
    used_logins: set[str] = set()

    for row in rows:
        login_name = _login_from_email(row["email"], row["id"], used_logins)
        bind.execute(
            sa.text("UPDATE users SET login_name = :login_name WHERE id = :id"),
            {"login_name": login_name, "id": row["id"]},
        )

    op.alter_column(
        "users",
        "login_name",
        existing_type=sa.String(length=80),
        nullable=False,
    )
    op.create_index(op.f("ix_users_login_name"), "users", ["login_name"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_login_name"), table_name="users")
    op.drop_column("users", "login_name")
