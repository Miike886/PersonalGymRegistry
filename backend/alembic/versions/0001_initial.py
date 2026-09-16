"""initial gym schema

Revision ID: 0001
"""
from alembic import op
from app.database import Base
from app import models
revision='0001'; down_revision=None; branch_labels=None; depends_on=None
def upgrade():
    bind=op.get_bind(); Base.metadata.create_all(bind)
def downgrade(): Base.metadata.drop_all(op.get_bind())
