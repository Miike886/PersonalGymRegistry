from alembic import command
from alembic.config import Config
from pathlib import Path
import sqlite3
from app.config import settings
from app.schemas import SetCreate, SetUpdate
import pytest
from pydantic import ValidationError

def test_load_units_default_to_pounds_and_reject_unknown_units():
    assert SetCreate(reps=8, load_value=50).load_unit == "lb"
    assert SetCreate(reps=8, load_unit="kg").load_unit == "kg"
    with pytest.raises(ValidationError):
        SetCreate(reps=8, load_unit="stone")
    with pytest.raises(ValidationError):
        SetUpdate(load_unit=None)
    assert SetUpdate(reps=10).model_dump(exclude_unset=True) == {"reps":10}

def test_migration_preserves_legacy_loads(tmp_path, monkeypatch):
    database=tmp_path/"legacy.db"
    monkeypatch.setattr(settings,"database_url","sqlite:///"+database.as_posix())
    backend=Path(__file__).resolve().parents[1]
    config=Config(str(backend/"alembic.ini"))
    config.set_main_option("script_location",str(backend/"alembic"))
    command.upgrade(config,"0002")
    with sqlite3.connect(database) as db:
        db.execute("INSERT INTO routines(id,name) VALUES(1,'FREE')")
        db.execute("INSERT INTO workouts(id,routine_id) VALUES(1,1)")
        db.execute("INSERT INTO workout_exercises(id,workout_id,exercise_name_snapshot,position,skipped) VALUES(1,1,'Legacy',1,0)")
        db.execute("INSERT INTO workout_sets(workout_exercise_id,position,reps,load_value,weight_type,set_type) VALUES(1,1,8,50,'EXTERNAL','WORKING')")
    command.upgrade(config,"head")
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT load_value,load_unit FROM workout_sets").fetchone()==(50,"kg")
    command.downgrade(config,"0002")
    command.upgrade(config,"head")
    with sqlite3.connect(database) as db:
        db.execute("UPDATE workout_sets SET load_unit='lb'")
    with pytest.raises(RuntimeError, match="Cannot remove load units"):
        command.downgrade(config,"0002")
