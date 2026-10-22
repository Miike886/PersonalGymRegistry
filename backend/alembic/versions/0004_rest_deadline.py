"""Persist the current rest deadline, without changing historical session times."""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("workouts", sa.Column("rest_until", sa.DateTime(timezone=True), nullable=True))

def downgrade():
    op.drop_column("workouts", "rest_until")
