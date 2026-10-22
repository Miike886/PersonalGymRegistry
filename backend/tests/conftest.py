import os
from tempfile import TemporaryDirectory
from datetime import datetime, timezone

import pytest

# Never use the developer's .env database for tests.
test_directory = TemporaryDirectory(prefix="gym-owner-tests-")
os.environ["DATABASE_URL"] = "sqlite:///" + test_directory.name.replace("\\", "/") + "/test.db"

from app.auth import LoginThrottle, password_hasher
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.main import app

PASSWORD = "local-test-password-928!"
ORIGIN = "http://localhost:5173"


@pytest.fixture(scope="session")
def owner_hash():
    return password_hasher.hash(PASSWORD)


@pytest.fixture(autouse=True)
def isolated_database(monkeypatch, owner_hash):
    monkeypatch.setattr(settings, "owner_username", "owner")
    monkeypatch.setattr(settings, "owner_password_hash", owner_hash)
    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "cors_origins", ORIGIN)
    monkeypatch.setattr(settings, "allowed_hosts", "testserver,localhost,127.0.0.1")
    monkeypatch.setattr(settings, "session_days", 30)
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())
    with SessionLocal() as db:
        db.add(LoginThrottle(id=1, attempts=0, window_started_at=datetime.now(timezone.utc)))
        db.commit()
    yield


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_database():
    yield
    engine.dispose()
    test_directory.cleanup()
