"""initial gym schema

Revision ID: 0001
"""
from alembic import op
from app.database import Base
from app import models
revision='0001'; down_revision=None; branch_labels=None; depends_on=None
def workout_tables():
    return [table for table in Base.metadata.sorted_tables if table.name not in {"owner_sessions", "login_throttle"}]
def upgrade():
    bind=op.get_bind(); Base.metadata.create_all(bind, tables=workout_tables())
def downgrade(): Base.metadata.drop_all(op.get_bind(), tables=workout_tables())
