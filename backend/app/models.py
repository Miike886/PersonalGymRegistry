import enum
from datetime import datetime
from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class LoadConvention(str, enum.Enum): TOTAL = "TOTAL"; PER_HAND = "PER_HAND"
class WeightType(str, enum.Enum): EXTERNAL = "EXTERNAL"; BODYWEIGHT = "BODYWEIGHT"; BODYWEIGHT_PLUS = "BODYWEIGHT_PLUS"; BODYWEIGHT_ASSISTED = "BODYWEIGHT_ASSISTED"
class SetType(str, enum.Enum): WORKING = "WORKING"; WARMUP = "WARMUP"


class Routine(Base):
    __tablename__ = "routines"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(30), unique=True)
    exercises: Mapped[list["RoutineExercise"]] = relationship(back_populates="routine", cascade="all, delete-orphan", order_by="RoutineExercise.position")

class Exercise(Base):
    __tablename__ = "exercises"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    load_convention: Mapped[LoadConvention] = mapped_column(Enum(LoadConvention), default=LoadConvention.TOTAL)
    is_active: Mapped[bool] = mapped_column(default=True)

class RoutineExercise(Base):
    __tablename__ = "routine_exercises"
    __table_args__ = (UniqueConstraint("routine_id", "position"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    routine_id: Mapped[int] = mapped_column(ForeignKey("routines.id", ondelete="CASCADE"))
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"))
    position: Mapped[int] = mapped_column(Integer)
    routine: Mapped[Routine] = relationship(back_populates="exercises")
    exercise: Mapped[Exercise] = relationship()

class Workout(Base):
    __tablename__ = "workouts"
    __table_args__ = (Index("uq_one_active_workout", text("(1)"), unique=True, postgresql_where=text("ended_at IS NULL"), sqlite_where=text("ended_at IS NULL")),)
    id: Mapped[int] = mapped_column(primary_key=True)
    routine_id: Mapped[int] = mapped_column(ForeignKey("routines.id"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    routine: Mapped[Routine] = relationship()
    exercises: Mapped[list["WorkoutExercise"]] = relationship(back_populates="workout", cascade="all, delete-orphan", order_by="WorkoutExercise.position")

class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"
    __table_args__ = (UniqueConstraint("workout_id", "position"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    workout_id: Mapped[int] = mapped_column(ForeignKey("workouts.id", ondelete="CASCADE"), index=True)
    exercise_id: Mapped[int | None] = mapped_column(ForeignKey("exercises.id"), nullable=True)
    exercise_name_snapshot: Mapped[str] = mapped_column(String(100))
    position: Mapped[int] = mapped_column(Integer)
    skipped: Mapped[bool] = mapped_column(default=False)
    workout: Mapped[Workout] = relationship(back_populates="exercises")
    exercise: Mapped[Exercise | None] = relationship()
    sets: Mapped[list["WorkoutSet"]] = relationship(back_populates="workout_exercise", cascade="all, delete-orphan", order_by="WorkoutSet.position")

class WorkoutSet(Base):
    __tablename__ = "workout_sets"
    __table_args__ = (UniqueConstraint("workout_exercise_id", "position"), CheckConstraint("reps > 0"))
    id: Mapped[int] = mapped_column(primary_key=True)
    workout_exercise_id: Mapped[int] = mapped_column(ForeignKey("workout_exercises.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    reps: Mapped[int] = mapped_column(Integer)
    load_value: Mapped[float | None] = mapped_column(nullable=True)
    weight_type: Mapped[WeightType] = mapped_column(Enum(WeightType), default=WeightType.EXTERNAL)
    set_type: Mapped[SetType] = mapped_column(Enum(SetType), default=SetType.WORKING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    workout_exercise: Mapped[WorkoutExercise] = relationship(back_populates="sets")
