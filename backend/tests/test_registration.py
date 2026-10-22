import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.auth import OwnerAccount, OwnerSession, password_hasher
from app.config import settings
from app.database import SessionLocal
from app.main import app
from conftest import ORIGIN, PASSWORD

TOKEN = "test-owner-activation-token-928"


def register(client, **overrides):
    body = dict(username="my-owner", password=PASSWORD, setup_token=TOKEN, remember=True)
    body.update(overrides)
    return client.post("/auth/register", headers={"Origin": ORIGIN}, json=body)


def test_registration_requires_explicit_activation_and_origin(monkeypatch):
    with TestClient(app) as client:
        assert client.get("/auth/registration").json() == {"available": False, "configured": True}
        assert register(client).status_code == 409
        monkeypatch.setattr(settings, "owner_setup_token", TOKEN)
        assert client.get("/auth/registration").json()["available"] is True
        assert client.post("/auth/register", json={}).status_code == 403
        assert client.post("/auth/register", headers={"Origin": "https://attacker.example"}, json={}).status_code == 403
        assert register(client, setup_token="incorrect-code-long-enough").status_code == 403
        assert client.get("/workouts").status_code == 401
        assert not client.cookies


def test_only_owner_can_register_once_and_login_after_reopen(monkeypatch):
    monkeypatch.setattr(settings, "owner_setup_token", TOKEN)
    monkeypatch.setattr(settings, "owner_password_hash", "")
    with TestClient(app) as client:
        assert client.get("/auth/registration").json() == {"available": True, "configured": False}
        result = register(client)
        assert result.status_code == 201
        assert result.json() == {"username": "my-owner"}
        assert "HttpOnly" in result.headers["set-cookie"]
        assert client.get("/auth/session").json() == {"username": "my-owner"}
        assert client.get("/routines").status_code == 200
        assert client.get("/auth/registration").json() == {"available": False, "configured": True}
        assert register(client, username="replacement").status_code == 409
        with SessionLocal() as db:
            owner = db.get(OwnerAccount, 1)
            assert owner.password_hash != PASSWORD
            assert password_hasher.verify(PASSWORD, owner.password_hash)
            db.add(OwnerAccount(id=2, username="second", password_hash=owner.password_hash))
            with pytest.raises(IntegrityError):
                db.commit()
        assert client.post("/auth/logout", headers={"Origin": ORIGIN}).status_code == 204
    # Account persists independently of configuration and browser cookies.
    monkeypatch.setattr(settings, "owner_setup_token", "")
    with TestClient(app) as reopened:
        assert reopened.post("/auth/login", headers={"Origin": ORIGIN}, json={"username":"my-owner", "password":PASSWORD}).status_code == 200
        assert reopened.get("/auth/session").json() == {"username":"my-owner"}


def test_registration_replaces_legacy_credentials_and_revokes_sessions(monkeypatch):
    monkeypatch.setattr(settings, "owner_setup_token", TOKEN)
    with TestClient(app) as legacy, TestClient(app) as claim:
        assert legacy.post("/auth/login", headers={"Origin":ORIGIN}, json={"username":"owner", "password":PASSWORD}).status_code == 200
        assert register(claim).status_code == 201
        assert legacy.get("/workouts").status_code == 401
        assert legacy.post("/auth/login", headers={"Origin":ORIGIN}, json={"username":"owner", "password":PASSWORD}).status_code == 401
        with SessionLocal() as db:
            assert len(db.scalars(select(OwnerSession)).all()) == 1


@pytest.mark.parametrize("changes", [{"password":"short"}, {"username":"   "}, {"username":" owner "}, {"setup_token":"short"}])
def test_registration_validation(monkeypatch, changes):
    monkeypatch.setattr(settings, "owner_setup_token", TOKEN)
    with TestClient(app) as client:
        assert register(client, **changes).status_code == 422
        assert client.get("/workouts").status_code == 401


def test_activation_attempts_are_throttled_and_share_login_limit(monkeypatch):
    monkeypatch.setattr(settings, "owner_setup_token", TOKEN)
    with TestClient(app) as client:
        for _ in range(10):
            assert register(client, setup_token="incorrect-code-long-enough").status_code == 403
        assert register(client).status_code == 429
        assert client.post("/auth/login", headers={"Origin":ORIGIN}, json={"username":"owner", "password":PASSWORD}).status_code == 429
        with SessionLocal() as db:
            assert db.get(OwnerAccount, 1) is None
