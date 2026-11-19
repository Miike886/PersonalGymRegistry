from datetime import datetime, timedelta, timezone
import importlib

import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app, as_utc
from app.models import Exercise, Routine, Workout, WorkoutExercise, WorkoutSet
from conftest import ORIGIN
from test_domain import owner_client


@pytest.fixture
def clock(monkeypatch):
    value = [datetime.now(timezone.utc)]
    monkeypatch.setattr(importlib.import_module("app.main"), "utc_now", lambda: value[0])
    return value


def seed_session(clock, age=timedelta(hours=6), series=True):
    with SessionLocal() as db:
        routine, exercise = Routine(name="PUSH"), Exercise(name="Timed press")
        db.add_all([routine, exercise]); db.flush()
        started = clock[0] - age
        workout = Workout(routine_id=routine.id, started_at=started, rest_until=clock[0]+timedelta(seconds=100), notes="Keep this")
        db.add(workout); db.flush()
        item = WorkoutExercise(workout_id=workout.id, exercise_id=exercise.id, exercise_name_snapshot=exercise.name, position=1)
        db.add(item); db.flush()
        ids = []
        if series:
            for position, minutes, kind in [(1, 45, "WORKING"), (2, 60, "WARMUP")]:
                record = WorkoutSet(workout_exercise_id=item.id, position=position, reps=8, load_value=42.5, load_unit="kg", set_type=kind, created_at=started+timedelta(minutes=minutes))
                db.add(record); db.flush(); ids.append(record.id)
        db.commit()
        return workout.id, item.id, ids, routine.id, exercise.id, started


def assert_closed(workout_id, expected):
    with SessionLocal() as db:
        workout = db.get(Workout, workout_id)
        assert as_utc(workout.ended_at) == expected
        assert workout.rest_until is None
        assert workout.notes == "Keep this"


def test_manual_finish_uses_last_retained_series_and_is_idempotent(clock):
    workout_id, item_id, ids, _, _, started = seed_session(clock, age=timedelta(hours=2))
    with owner_client() as client:
        assert client.patch(f"/sets/{ids[-1]}", json={"reps": 12}).status_code == 200
        response = client.post(f"/workouts/{workout_id}/finish")
        assert response.status_code == 200
        assert as_utc(datetime.fromisoformat(response.json()["ended_at"])) == started+timedelta(hours=1)
        clock[0] += timedelta(days=2)
        assert client.post(f"/workouts/{workout_id}/finish").json()["ended_at"] == response.json()["ended_at"]
        assert client.post(f"/workout-exercises/{item_id}/sets", json={"reps": 8}).status_code == 409
    assert_closed(workout_id, started+timedelta(hours=1))


def test_deleted_latest_series_is_not_used_as_finish_time(clock):
    workout_id, _, ids, _, _, started = seed_session(clock, age=timedelta(hours=2))
    with owner_client() as client:
        assert client.delete(f"/sets/{ids[-1]}").status_code == 204
        assert client.post(f"/workouts/{workout_id}/finish").status_code == 200
    assert_closed(workout_id, started+timedelta(minutes=45))


@pytest.mark.parametrize("automatic", [False, True])
def test_empty_session_has_zero_duration(clock, automatic):
    workout_id, _, _, _, _, started = seed_session(clock, series=False)
    with owner_client() as client:
        if automatic:
            assert client.get("/workouts/active").json() is None
        else:
            assert client.post(f"/workouts/{workout_id}/finish").status_code == 200
    assert_closed(workout_id, started)


def test_exact_five_hour_boundary_and_latest_series_across_exercises(clock):
    workout_id, _, _, _, exercise_id, started = seed_session(clock, age=timedelta(hours=5)-timedelta(seconds=1))
    with SessionLocal() as db:
        item = WorkoutExercise(workout_id=workout_id, exercise_id=exercise_id, exercise_name_snapshot="Another snapshot", position=2)
        db.add(item); db.flush()
        db.add(WorkoutSet(workout_exercise_id=item.id, position=1, reps=9, created_at=clock[0]))
        db.commit()
    with owner_client() as client:
        assert client.get("/workouts/active").json()["id"] == workout_id
        clock[0] += timedelta(seconds=1)
        assert client.get("/workouts/active").json() is None
    assert_closed(workout_id, started+timedelta(hours=5)-timedelta(seconds=1))


@pytest.mark.parametrize("route", ["/workouts/active", "/workouts", "/workouts/{workout}", "/routines/{routine}/last-workout", "/routines/{routine}/recent-workouts"])
def test_reads_recover_forgotten_session_without_extending_duration(clock, route):
    workout_id, _, _, routine_id, _, started = seed_session(clock, age=timedelta(days=2))
    with owner_client() as client:
        response = client.get(route.format(workout=workout_id, routine=routine_id))
        assert response.status_code == 200
        if route == "/workouts/active":
            assert response.json() is None
        else:
            payload = response.json()
            item = payload[0] if isinstance(payload, list) else payload
            assert item["id"] == workout_id
            assert len(item["exercises"][0]["sets"]) == 2
            assert item["exercises"][0]["sets"][0]["load_unit"] == "kg"
        assert client.get("/workouts/active").json() is None
    assert_closed(workout_id, started+timedelta(hours=1))


@pytest.mark.parametrize("operation", ["add_set", "edit_set", "delete_set", "add_exercise", "edit_exercise", "skip_rest"])
def test_mutation_at_timeout_closes_and_persists_before_rejecting(clock, operation):
    workout_id, item_id, ids, _, exercise_id, started = seed_session(clock)
    with owner_client() as client:
        calls = {
            "add_set": lambda: client.post(f"/workout-exercises/{item_id}/sets", json={"reps": 5}),
            "edit_set": lambda: client.patch(f"/sets/{ids[0]}", json={"reps": 99}),
            "delete_set": lambda: client.delete(f"/sets/{ids[0]}"),
            "add_exercise": lambda: client.post(f"/workouts/{workout_id}/exercises", json={"exercise_id": exercise_id}),
            "edit_exercise": lambda: client.patch(f"/workout-exercises/{item_id}", json={"skipped": True}),
            "skip_rest": lambda: client.post(f"/workouts/{workout_id}/rest/skip"),
        }
        assert calls[operation]().status_code == 409
    assert_closed(workout_id, started+timedelta(hours=1))
    with SessionLocal() as db:
        assert db.query(WorkoutSet).count() == 2
        assert db.get(WorkoutSet, ids[0]).reps == 8
        assert db.get(WorkoutExercise, item_id).skipped is False


def test_create_workout_releases_expired_slot_and_preserves_existing_history(clock):
    workout_id, _, _, routine_id, _, started = seed_session(clock)
    with SessionLocal() as db:
        old = Workout(routine_id=routine_id, started_at=started-timedelta(days=2), ended_at=started-timedelta(days=1))
        db.add(old); db.commit(); old_id, old_end = old.id, old.ended_at
    with owner_client() as client:
        response = client.post("/workouts", json={"routine_id": routine_id})
        assert response.status_code == 201
        assert response.json()["id"] != workout_id
        assert client.post("/workouts", json={"routine_id": routine_id}).status_code == 409
        assert as_utc(datetime.fromisoformat(client.get(f"/workouts/{old_id}").json()["ended_at"])) == as_utc(old_end)
    assert_closed(workout_id, started+timedelta(hours=1))


def test_anonymous_reads_do_not_close_private_workout(clock):
    workout_id, _, _, _, _, _ = seed_session(clock)
    with TestClient(app, headers={"Origin": ORIGIN}) as client:
        assert client.get("/workouts/active").status_code == 401
    with SessionLocal() as db:
        assert db.get(Workout, workout_id).ended_at is None
