import sqlite3
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app.config import settings
from app.database import SessionLocal
from app.main import app
from app.models import Exercise, ExerciseVariant, Routine, RoutineExercise
from test_domain import owner_client


def seed_routine(name="PUSH"):
    with SessionLocal() as db:
        routine = Routine(name=name)
        exercises = [Exercise(name="Press Smith"), Exercise(name="Curl")]
        db.add_all([routine, *exercises])
        db.flush()
        for position, exercise in enumerate(exercises, 1):
            db.add(RoutineExercise(routine_id=routine.id, exercise_id=exercise.id, position=position))
        db.commit()
        return routine.id


def test_variants_reusable_separate_and_snapshotted():
    routine_id = seed_routine()
    with owner_client() as client:
        workout = client.post("/workouts", json={"routine_id": routine_id}).json()
        item, other = workout["exercises"]
        path = f"/workout-exercises/{item['id']}/variant"
        assert item["variant_id"] is None
        created = client.put(path, json={"name": "  Máquina   morada ", "load_convention": "PER_HAND"})
        assert created.status_code == 200
        variant_id = created.json()["variant_id"]
        assert created.json()["variant_name_snapshot"] == "Máquina morada"
        assert created.json()["exercise_name_snapshot"] == "Press Smith"
        assert created.json()["variant_load_convention_snapshot"] == "PER_HAND"
        assert client.put(path, json={"name": "máquina morada", "load_convention": "PER_HAND"}).json()["variant_id"] == variant_id
        assert client.put(path, json={"name": "Máquina morada"}).status_code == 409
        assert client.put(f"/workout-exercises/{other['id']}/variant", json={"variant_id": variant_id}).status_code == 422
        assert client.put(path, json={"variant_id": 9999}).status_code == 422
        assert client.get("/workouts/active").json()["exercises"][0]["variant_id"] == variant_id
        catalog = client.get("/exercises").json()
        assert next(e for e in catalog if e["id"] == item["exercise_id"])["variants"][0]["id"] == variant_id
        with SessionLocal() as db:
            assert db.query(ExerciseVariant).count() == 1
            variant = db.get(ExerciseVariant, variant_id)
            variant.name = "Nombre cambiado"
            variant.load_convention = "TOTAL"
            db.commit()
        saved = client.get("/workouts/active").json()["exercises"][0]
        assert saved["variant_name_snapshot"] == "Máquina morada"
        assert saved["variant_load_convention_snapshot"] == "PER_HAND"
        series = client.post(f"/workout-exercises/{item['id']}/sets", json={"reps": 8, "load_value": 42.5, "load_unit": "lb"})
        assert series.status_code == 201
        assert series.json()["load_value"] == 42.5
        client.post(f"/workouts/{workout['id']}/finish")
        assert client.put(path, json={"variant_id": None}).status_code == 409
        next_workout = client.post("/workouts", json={"routine_id": routine_id}).json()
        next_item = next_workout["exercises"][0]
        assert next_item["variant_id"] is None
        assert client.put(f"/workout-exercises/{next_item['id']}/variant", json={"variant_id": variant_id}).status_code == 200
        assert client.get(f"/workouts/{workout['id']}").json()["exercises"][0]["variant_name_snapshot"] == "Máquina morada"


@pytest.mark.parametrize("name", ["PUSH", "PULL", "LEGS", "FREE"])
def test_variant_cannot_reassign_recorded_sets(name):
    routine_id = seed_routine(name)
    with owner_client() as client:
        workout = client.post("/workouts", json={"routine_id": routine_id}).json()
        item = workout["exercises"][0]
        path = f"/workout-exercises/{item['id']}/variant"
        client.put(path, json={"name": "Smith"})
        series = client.post(f"/workout-exercises/{item['id']}/sets", json={"reps": 10, "set_type": "WARMUP"}).json()
        assert client.put(path, json={"name": "Amarilla"}).status_code == 409
        assert client.put(path, json={"variant_id": None}).status_code == 409
        assert client.get("/workouts/active").json()["exercises"][0]["variant_name_snapshot"] == "Smith"
        with SessionLocal() as db:
            assert db.query(ExerciseVariant).count() == 1
        client.delete(f"/sets/{series['id']}")
        reset = client.put(path, json={"variant_id": None})
        assert reset.status_code == 200
        assert reset.json()["variant_name_snapshot"] is None
        assert reset.json()["variant_load_convention_snapshot"] is None


def test_variant_validation_and_authentication():
    routine_id = seed_routine()
    with owner_client() as client:
        item = client.post("/workouts", json={"routine_id": routine_id}).json()["exercises"][0]
        path = f"/workout-exercises/{item['id']}/variant"
        for payload in [{}, {"name": " "}, {"name": "x" * 101}, {"variant_id": -1}, {"variant_id": 1, "name": "Smith"}, {"name": "Smith", "load_convention": "INVALID"}]:
            assert client.put(path, json=payload).status_code == 422
        with SessionLocal() as db:
            db.get(Exercise, item["exercise_id"]).is_active = False
            db.commit()
        assert client.put(path, json={"name": "Smith"}).status_code == 409
    with TestClient(app) as anonymous:
        assert anonymous.put(path, json={"name": "Smith"}).status_code == 401


def test_variant_migration_preserves_legacy_records(tmp_path, monkeypatch):
    database = tmp_path / "variants.db"
    monkeypatch.setattr(settings, "database_url", "sqlite:///" + database.as_posix())
    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))
    command.upgrade(config, "0005")
    with sqlite3.connect(database) as db:
        db.execute("INSERT INTO routines (id,name) VALUES (1,'PUSH')")
        db.execute("INSERT INTO exercises (id,name,load_convention,is_active) VALUES (1,'Smith','TOTAL',1)")
        db.execute("INSERT INTO workouts (id,routine_id) VALUES (1,1)")
        db.execute("INSERT INTO workout_exercises (id,workout_id,exercise_id,exercise_name_snapshot,position,skipped) VALUES (1,1,1,'Smith',1,0)")
        db.execute("INSERT INTO workout_sets (id,workout_exercise_id,position,reps,load_value,load_unit,weight_type,set_type) VALUES (1,1,1,8,75,'kg','EXTERNAL','WORKING')")
    command.upgrade(config, "head")
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT exercise_name_snapshot,variant_id,variant_name_snapshot FROM workout_exercises").fetchone() == ("Smith", None, None)
        assert db.execute("SELECT reps,load_value,load_unit FROM workout_sets").fetchone() == (8, 75, "kg")
        assert db.execute("PRAGMA foreign_key_check").fetchall() == []
    command.downgrade(config, "0005")
    command.upgrade(config, "head")
    with sqlite3.connect(database) as db:
        db.execute("INSERT INTO exercise_variants (id,exercise_id,name,load_convention) VALUES (1,1,'Morada','TOTAL')")
        db.execute("UPDATE workout_exercises SET variant_id=1,variant_name_snapshot='Morada',variant_load_convention_snapshot='TOTAL'")
    with pytest.raises(RuntimeError, match="Cannot remove recorded exercise variants"):
        command.downgrade(config, "0005")
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT variant_name_snapshot FROM workout_exercises").fetchone() == ("Morada",)
