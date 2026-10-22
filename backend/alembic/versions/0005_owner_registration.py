"""One self-registered owner, preserving existing workouts and legacy credentials."""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "owner_account",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.CheckConstraint("id = 1", name="ck_single_owner"),
    )


def downgrade():
    if op.get_bind().scalar(sa.text("SELECT COUNT(*) FROM owner_account")):
        raise RuntimeError("Cannot remove registered owner credentials; preserve or explicitly remove the account first")
    op.drop_table("owner_account")
