"""Persistent owner sessions and cross-instance login throttling.

Revision ID: 0002
Revises: 0001
"""
from datetime import datetime, timezone
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    # 0001 uses live metadata: skip auth tables there on fresh installations,
    # then create them explicitly here.
    op.create_table(
        "owner_sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("credential_version", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_owner_sessions_expires_at", "owner_sessions", ["expires_at"])
    op.create_table(
        "login_throttle",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
    )
    table = sa.table("login_throttle", sa.column("id", sa.Integer), sa.column("attempts", sa.Integer), sa.column("window_started_at", sa.DateTime(timezone=True)))
    op.bulk_insert(table, [{"id": 1, "attempts": 0, "window_started_at": datetime.now(timezone.utc)}])


def downgrade():
    op.drop_table("login_throttle")
    op.drop_index("ix_owner_sessions_expires_at", table_name="owner_sessions")
    op.drop_table("owner_sessions")
