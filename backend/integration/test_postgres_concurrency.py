"""Real PostgreSQL locks, using a dedicated local test database and disposable schemas."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import os
from pathlib import Path
from threading import Event
import time
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import CreateSchema, DropSchema

test_url = os.environ.get("TEST_POSTGRES_URL")
if not test_url:
    pytest.skip("Set TEST_POSTGRES_URL for the isolated PostgreSQL tests", allow_module_level=True)
parsed_url = make_url(test_url)
if parsed_url.host not in {"localhost", "127.0.0.1", "::1"} or parsed_url.database != "gym_integrity_test" or parsed_url.get_backend_name() != "postgresql":
    raise RuntimeError("PostgreSQL integration tests require a loopback gym_integrity_test database")
os.environ["DATABASE_URL"] = test_url

from alembic import command
from alembic.config import Config
from fastapi import HTTPException
from app.config import settings
from app.main import add_set, create_workout, locked_workout
from app.models import Exercise, Routine, RoutineExercise, Workout, WorkoutSet
from app.schemas import SetCreate, WorkoutCreate


@pytest.fixture
def sessions(monkeypatch):
    schema = "integrity_" + uuid4().hex
    admin = create_engine(test_url, connect_args={"connect_timeout": 5})
    with admin.begin() as connection:
        connection.execute(CreateSchema(schema))
    schema_url = parsed_url.update_query_dict({"options": f"-csearch_path={schema} -cstatement_timeout=10000 -clock_timeout=8000"}).render_as_string(hide_password=False)
    engine = create_engine(schema_url, connect_args={"connect_timeout": 5})
    try:
        monkeypatch.setattr(settings, "database_url", schema_url)
        backend = Path(__file__).resolve().parents[1]
        config = Config(str(backend / "alembic.ini"))
        config.set_main_option("script_location", str(backend / "alembic"))
        command.upgrade(config, "head")
        yield sessionmaker(bind=engine, autoflush=False)
    finally:
        engine.dispose()
        with admin.begin() as connection:
            connection.execute(DropSchema(schema, cascade=True))
        admin.dispose()


def routine_id(sessions):
    with sessions() as db:
        routine, exercise = Routine(name="PUSH"), Exercise(name="Concurrent press")
        db.add_all([routine, exercise])
        db.flush()
        db.add(RoutineExercise(routine_id=routine.id, exercise_id=exercise.id, position=1))
        db.commit()
        return routine.id


def active_workout(sessions):
    routine = routine_id(sessions)
    with sessions() as db:
        workout = create_workout(WorkoutCreate(routine_id=routine), db)
        return workout.id, workout.exercises[0].id


def assert_blocked(sessions, waiter, holder):
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        with sessions() as observer:
            blockers = observer.scalar(text("SELECT pg_blocking_pids(:pid)"), {"pid": waiter})
        if holder in blockers:
            return
        time.sleep(0.02)
    raise AssertionError("The competing connection never waited for the expected PostgreSQL lock")


def test_finish_prevents_waiting_set_write_even_with_stale_orm(sessions):
    workout_id, item_id = active_workout(sessions)
    waiting = Event()
    waiter_pid = []
    with sessions() as holder, ThreadPoolExecutor(max_workers=1) as pool:
        holder_pid = holder.scalar(text("SELECT pg_backend_pid()"))
        def contender():
            with sessions() as db:
                cached = db.get(Workout, workout_id)
                waiter_pid.append(db.scalar(text("SELECT pg_backend_pid()")))
                waiting.set()
                # The holder takes the lock after the stale ORM read, before this mutation.
                assert locked.wait(5)
                assert cached.ended_at is None
                try:
                    add_set(item_id, SetCreate(reps=8), db)
                except HTTPException as error:
                    db.rollback()
                    return error.status_code
                return 201
        locked = Event()
        future = pool.submit(contender)
        try:
            assert waiting.wait(5)
            workout = locked_workout(holder, workout_id)
            workout.ended_at = datetime.now(timezone.utc)
            holder.flush()
            locked.set()
            assert_blocked(sessions, waiter_pid[0], holder_pid)
            holder.commit()
            assert future.result(timeout=10) == 409
        finally:
            holder.rollback()
            locked.set()
        with sessions() as db:
            assert db.scalar(select(func.count()).select_from(WorkoutSet)) == 0


def run_competing_commits(sessions, operation):
    """Pause the first transaction at commit and prove that the second waits for it."""
    first_ready, release, second_ready = Event(), Event(), Event()
    pids = {}
    def first():
        with sessions() as db:
            pids["first"] = db.scalar(text("SELECT pg_backend_pid()"))
            commit = db.commit
            def delayed_commit():
                first_ready.set()
                assert release.wait(10)
                commit()
            db.commit = delayed_commit
            return operation(db)
    def second():
        with sessions() as db:
            pids["second"] = db.scalar(text("SELECT pg_backend_pid()"))
            second_ready.set()
            try:
                return operation(db)
            except HTTPException as error:
                db.rollback()
                return error.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        one = pool.submit(first)
        try:
            assert first_ready.wait(5)
            two = pool.submit(second)
            assert second_ready.wait(5)
            assert_blocked(sessions, pids["second"], pids["first"])
        finally:
            release.set()
        return one.result(timeout=10), two.result(timeout=10)


def test_simultaneous_sets_receive_distinct_consecutive_positions(sessions):
    _, item_id = active_workout(sessions)
    def operation(db):
        return add_set(item_id, SetCreate(reps=8, load_value=30), db).position
    assert run_competing_commits(sessions, operation) == (1, 2)
    with sessions() as db:
        records = db.scalars(select(WorkoutSet).order_by(WorkoutSet.position)).all()
        assert [row.position for row in records] == [1, 2]
        assert [row.reps for row in records] == [8, 8]


def test_simultaneous_workout_creation_returns_conflict_and_one_active(sessions):
    routine = routine_id(sessions)
    def operation(db):
        create_workout(WorkoutCreate(routine_id=routine), db)
        return 201
    assert run_competing_commits(sessions, operation) == (201, 409)
    with sessions() as db:
        assert db.scalar(select(func.count()).select_from(Workout).where(Workout.ended_at.is_(None))) == 1
