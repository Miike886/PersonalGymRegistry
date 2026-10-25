from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.database import SessionLocal
from app.main import add_set, create_workout
from app.models import Exercise, Routine, RoutineExercise, Workout
from app.schemas import SetCreate, WorkoutCreate
from test_domain import owner_client


def active_workout(client, positions=(1, 2, 3)):
    with SessionLocal() as db:
        routine = Routine(name='PUSH')
        db.add(routine)
        db.flush()
        for index, position in enumerate(positions):
            exercise = Exercise(name=f'Exercise {index}')
            db.add(exercise)
            db.flush()
            db.add(RoutineExercise(routine_id=routine.id, exercise_id=exercise.id, position=position))
        db.commit()
        routine_id = routine.id
    return client.post('/workouts', json={'routine_id': routine_id}).json()


@pytest.mark.parametrize('positions,index,target', [((1, 2, 3), 1, 1), ((1, 2, 3), 0, 3), ((1000, 1001, 1002), 2, 1), ((1, 1000, 1001), 2, 1)])
def test_exercise_moves_preserve_unique_positions_and_snapshots(positions, index, target):
    with owner_client() as client:
        workout = active_workout(client, positions)
        original = workout['exercises']
        moved = original[index]
        response = client.patch(f"/workout-exercises/{moved['id']}", json={'position': target})
        assert response.status_code == 200
        result = client.get(f"/workouts/{workout['id']}").json()['exercises']
        expected = [item for item in original if item['id'] != moved['id']]
        expected.insert(target - 1, moved)
        assert [item['id'] for item in result] == [item['id'] for item in expected]
        assert [item['position'] for item in result] == [1, 2, 3]
        assert {item['id']: item['exercise_name_snapshot'] for item in result} == {item['id']: item['exercise_name_snapshot'] for item in original}
        assert [item['position'] for item in client.get('/routines').json()[0]['exercises']] == list(positions)


def test_insert_at_occupied_position_shifts_session_exercises():
    with owner_client() as client:
        workout = active_workout(client)
        exercise_id = workout['exercises'][0]['exercise_id']
        response = client.post(f"/workouts/{workout['id']}/exercises", json={'exercise_id': exercise_id, 'position': 1})
        assert response.status_code == 201
        items = client.get(f"/workouts/{workout['id']}").json()['exercises']
        assert items[0]['id'] == response.json()['id']
        assert [item['position'] for item in items] == [1, 2, 3, 4]


def test_inactive_catalog_id_cannot_be_added():
    with owner_client() as client:
        workout = active_workout(client)
        exercise_id = workout['exercises'][0]['exercise_id']
        with SessionLocal() as db:
            db.get(Exercise, exercise_id).is_active = False
            db.commit()
        response = client.post(f"/workouts/{workout['id']}/exercises", json={'exercise_id': exercise_id})
        assert response.status_code == 409


def test_local_database_enforces_workout_foreign_keys():
    from sqlalchemy.exc import IntegrityError
    with SessionLocal() as db:
        db.add(Workout(routine_id=999999))
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()


def test_stale_loaded_workout_cannot_receive_sets_after_finish():
    with owner_client() as client:
        workout = active_workout(client)
        with SessionLocal() as stale:
            cached_workout = stale.get(Workout, workout['id'])
            with SessionLocal() as other:
                other.get(Workout, workout['id']).ended_at = datetime.now(timezone.utc)
                other.commit()
            assert cached_workout.ended_at is None
            with pytest.raises(HTTPException) as error:
                add_set(workout['exercises'][0]['id'], SetCreate(reps=8), stale)
            assert error.value.status_code == 409


def test_seed_requires_migrations_and_preserves_history(tmp_path, monkeypatch):
    import os
    from pathlib import Path
    import sqlite3
    import subprocess
    import sys
    from alembic import command
    from alembic.config import Config
    from app.config import settings

    backend = Path(__file__).resolve().parents[1]
    database = tmp_path / 'seed.db'
    url = 'sqlite:///' + database.as_posix()
    environment = {**os.environ, 'DATABASE_URL': url}
    def seed():
        return subprocess.run([sys.executable, 'seed.py'], cwd=backend, env=environment, capture_output=True, text=True, timeout=30)
    assert seed().returncode != 0
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall() == []
    monkeypatch.setattr(settings, 'database_url', url)
    config = Config(str(backend / 'alembic.ini'))
    config.set_main_option('script_location', str(backend / 'alembic'))
    command.upgrade(config, 'head')
    result = seed()
    assert result.returncode == 0, result.stderr
    with sqlite3.connect(database) as db:
        db.execute('INSERT INTO workouts(id,routine_id) VALUES (100,1)')
        db.execute("INSERT INTO workout_exercises(id,workout_id,exercise_id,exercise_name_snapshot,position,skipped) VALUES (100,100,1,'Saved snapshot',1,0)")
        routine_count = db.execute('SELECT COUNT(*) FROM routine_exercises').fetchone()[0]
    result = seed()
    assert result.returncode == 0, result.stderr
    with sqlite3.connect(database) as db:
        assert db.execute('SELECT exercise_name_snapshot FROM workout_exercises WHERE id=100').fetchone() == ('Saved snapshot',)
        assert db.execute('SELECT COUNT(*) FROM routine_exercises').fetchone()[0] == routine_count


def test_concurrent_workout_creation_conflict_returns_409(monkeypatch):
    with owner_client() as client:
        workout = active_workout(client)
        with SessionLocal() as db:
            original_scalar = db.scalar
            calls = 0
            def miss_first_check(*args, **kwargs):
                nonlocal calls
                calls += 1
                return None if calls == 1 else original_scalar(*args, **kwargs)
            monkeypatch.setattr(db, 'scalar', miss_first_check)
            with pytest.raises(HTTPException) as error:
                create_workout(WorkoutCreate(routine_id=workout['routine_id']), db)
            assert error.value.status_code == 409
