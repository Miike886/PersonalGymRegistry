"""Explicit load units; preserve legacy values as kilograms.

Revision ID: 0003
"""
from alembic import op
import sqlalchemy as sa
revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("workout_sets", sa.Column("load_unit", sa.String(2), nullable=False, server_default="kg"))

def downgrade():
    # Downgrading mixed-unit data would silently turn pounds into kilograms.
    connection = op.get_bind()
    if connection.scalar(sa.text("SELECT COUNT(*) FROM workout_sets WHERE load_unit = 'lb'")):
        raise RuntimeError("Cannot remove load units while pound records exist; preserve or migrate those records first.")
    op.drop_column("workout_sets", "load_unit")
