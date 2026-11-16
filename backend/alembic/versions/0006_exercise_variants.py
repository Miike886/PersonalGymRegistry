"""Exercise variants and immutable session selection.

Revision ID: 0006
Revises: 0005
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    # Reuse the loadconvention PostgreSQL enum already created by 0001.
    convention = sa.Enum("TOTAL", "PER_HAND", name="loadconvention")
    if op.get_bind().dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import ENUM
        convention = ENUM("TOTAL", "PER_HAND", name="loadconvention", create_type=False)
    op.create_table(
        "exercise_variants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exercise_id", sa.Integer(), sa.ForeignKey("exercises.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("load_convention", convention, nullable=False),
        sa.UniqueConstraint("exercise_id", "name"),
    )
    op.create_index("ix_exercise_variants_exercise_id", "exercise_variants", ["exercise_id"])
    with op.batch_alter_table("workout_exercises") as batch:
        batch.add_column(sa.Column("variant_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("variant_name_snapshot", sa.String(100), nullable=True))
        batch.add_column(sa.Column("variant_load_convention_snapshot", convention, nullable=True))
        batch.create_foreign_key("fk_workout_exercises_variant", "exercise_variants", ["variant_id"], ["id"])


def downgrade():
    if op.get_bind().execute(sa.text("SELECT 1 FROM workout_exercises WHERE variant_id IS NOT NULL LIMIT 1")).first():
        raise RuntimeError("Cannot remove recorded exercise variants")
    with op.batch_alter_table("workout_exercises") as batch:
        batch.drop_constraint("fk_workout_exercises_variant", type_="foreignkey")
        batch.drop_column("variant_load_convention_snapshot")
        batch.drop_column("variant_name_snapshot")
        batch.drop_column("variant_id")
    op.drop_index("ix_exercise_variants_exercise_id", table_name="exercise_variants")
    op.drop_table("exercise_variants")
