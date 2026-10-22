"""Frozen initial gym schema.

Revision ID: 0001
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

def initial_metadata():
    metadata = sa.MetaData()
    sa.Table("routines", metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(30), nullable=False, unique=True))
    sa.Table("exercises", metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("load_convention", sa.Enum("TOTAL", "PER_HAND", name="loadconvention"), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False))
    sa.Table("routine_exercises", metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("routine_id", sa.ForeignKey("routines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("exercise_id", sa.ForeignKey("exercises.id"), nullable=False),
        sa.Column("position", sa.Integer, nullable=False),
        sa.UniqueConstraint("routine_id", "position"))
    workouts = sa.Table("workouts", metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("routine_id", sa.ForeignKey("routines.id"), nullable=False, index=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), index=True),
        sa.Column("notes", sa.Text))
    sa.Index("uq_one_active_workout", sa.text("(1)"), unique=True,
        postgresql_where=workouts.c.ended_at.is_(None),
        sqlite_where=workouts.c.ended_at.is_(None), _table=workouts)
    sa.Table("workout_exercises", metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("workout_id", sa.ForeignKey("workouts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("exercise_id", sa.ForeignKey("exercises.id")),
        sa.Column("exercise_name_snapshot", sa.String(100), nullable=False),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("skipped", sa.Boolean, nullable=False),
        sa.UniqueConstraint("workout_id", "position"))
    sa.Table("workout_sets", metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("workout_exercise_id", sa.ForeignKey("workout_exercises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("reps", sa.Integer, nullable=False),
        sa.Column("load_value", sa.Float),
        sa.Column("weight_type", sa.Enum("EXTERNAL", "BODYWEIGHT", "BODYWEIGHT_PLUS", "BODYWEIGHT_ASSISTED", name="weighttype"), nullable=False),
        sa.Column("set_type", sa.Enum("WORKING", "WARMUP", name="settype"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("workout_exercise_id", "position"), sa.CheckConstraint("reps > 0"))
    return metadata

def upgrade():
    initial_metadata().create_all(op.get_bind())

def downgrade():
    initial_metadata().drop_all(op.get_bind())
