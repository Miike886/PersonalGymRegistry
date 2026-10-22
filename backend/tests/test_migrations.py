from pathlib import Path
import sqlite3
import pytest
from alembic import command
from alembic.config import Config
from app.config import settings


def test_auth_migration_preserves_workouts_and_can_be_reapplied(tmp_path, monkeypatch):
    database = tmp_path / "migrations.db"
    monkeypatch.setattr(settings, "database_url", "sqlite:///" + database.as_posix())
    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))
    command.upgrade(config, "0001")
    with sqlite3.connect(database) as db:
        db.execute("INSERT INTO routines (id, name) VALUES (1, 'PUSH')")
        db.execute("INSERT INTO workouts (id, routine_id) VALUES (1, 1)")
    command.upgrade(config, "head")
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT id FROM workouts").fetchall() == [(1,)]
        assert db.execute("SELECT attempts FROM login_throttle WHERE id=1").fetchone() == (0,)
    command.downgrade(config, "0001")
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT id FROM workouts").fetchall() == [(1,)]
    command.upgrade(config, "head")
    command.upgrade(config, "head")
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT COUNT(*) FROM login_throttle").fetchone() == (1,)
        db.execute("INSERT INTO owner_account (id, username, password_hash) VALUES (1, 'registered-owner', 'saved-hash')")
    command.upgrade(config, "head")
    with pytest.raises(RuntimeError, match="Cannot remove registered owner credentials"):
        command.downgrade(config, "0004")
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT username, password_hash FROM owner_account").fetchone() == ('registered-owner', 'saved-hash')
        assert db.execute("SELECT id FROM workouts").fetchall() == [(1,)]
