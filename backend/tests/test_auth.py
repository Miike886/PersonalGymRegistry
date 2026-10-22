from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.auth import LoginThrottle, OwnerSession, cookie_name, digest, password_hasher, utcnow
from app.config import settings
from app.database import SessionLocal
from app.main import app
from conftest import ORIGIN, PASSWORD


def login(client, remember=True, password=PASSWORD, username="owner"):
    return client.post("/auth/login", headers={"Origin": ORIGIN}, json={
        "username": username, "password": password, "remember": remember,
    })


@pytest.mark.parametrize("method,path", [
    ("GET", "/routines"), ("GET", "/exercises"),
    ("GET", "/routines/1/last-workout"), ("GET", "/routines/1/recent-workouts"),
    ("GET", "/workouts/active"), ("GET", "/workouts"), ("POST", "/workouts"),
    ("GET", "/workouts/1"), ("DELETE", "/workouts/1"),
    ("POST", "/workouts/1/exercises"), ("PATCH", "/workout-exercises/1"),
    ("POST", "/workout-exercises/1/sets"), ("PATCH", "/sets/1"),
    ("DELETE", "/sets/1"), ("POST", "/workouts/1/finish"), ("GET", "/auth/session"),
])
def test_every_private_route_rejects_anonymous_and_legacy_token(method, path):
    with TestClient(app) as client:
        response = client.request(method, path, headers={"Origin": ORIGIN, "X-App-Token": "old-public-token"})
    assert response.status_code == 401
    assert response.headers["cache-control"] == "private, no-store"


def test_login_cookie_persists_and_logout_revokes_it(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    with TestClient(app, base_url="https://testserver") as client:
        result = login(client)
        assert result.status_code == 200
        assert result.json() == {"username": "owner"}
        cookie = result.headers["set-cookie"]
        assert "HttpOnly" in cookie and "Secure" in cookie and "SameSite=lax" in cookie
        assert "Max-Age=2592000" in cookie and "Path=/" in cookie
        raw_token = client.cookies.get(cookie_name())
        with SessionLocal() as db:
            saved = db.scalar(select(OwnerSession))
            assert saved.token_hash == digest(raw_token)
            assert saved.token_hash != raw_token
        # Reopening a browser retains the persistent cookie.
        with TestClient(app, base_url="https://testserver", cookies={cookie_name(): raw_token}) as reopened:
            assert reopened.get("/routines").status_code == 200
            assert reopened.get("/auth/session").json() == {"username": "owner"}
        response = client.post("/auth/logout", headers={"Origin": ORIGIN})
        assert response.status_code == 204 and "Max-Age=0" in response.headers["set-cookie"]
        assert client.get("/routines").status_code == 401
        client.cookies.set(cookie_name(), raw_token)
        assert client.get("/routines").status_code == 401


def test_session_expiry_and_password_change_invalidate_access(monkeypatch):
    with TestClient(app) as client:
        assert login(client).status_code == 200
        with SessionLocal() as db:
            saved = db.scalar(select(OwnerSession))
            saved.expires_at = utcnow() - timedelta(seconds=1)
            db.commit()
        assert client.get("/workouts").status_code == 401
        assert login(client).status_code == 200
        monkeypatch.setattr(settings, "owner_password_hash", "")
        assert client.get("/workouts").status_code == 401
        assert login(client).status_code == 503


def test_session_cookie_without_remember_and_random_cookie_rejected():
    with TestClient(app) as client:
        assert "Max-Age" not in login(client, remember=False).headers["set-cookie"]
        client.cookies.clear()
        client.cookies.set(cookie_name(), "invented-session")
        assert client.get("/workouts").status_code == 401


def test_real_password_and_username_rotation_revoke_existing_sessions(monkeypatch):
    with TestClient(app) as client:
        assert login(client).status_code == 200
        monkeypatch.setattr(settings, "owner_username", "renamed-owner")
        assert client.get("/auth/session").status_code == 401
        assert login(client, username="renamed-owner").status_code == 200
        monkeypatch.setattr(settings, "owner_password_hash", password_hasher.hash("replacement-test-password-928!"))
        assert client.get("/auth/session").status_code == 401
        assert login(client, username="renamed-owner").status_code == 401
        assert login(client, username="renamed-owner", password="replacement-test-password-928!").status_code == 200


def test_csrf_blocks_login_and_mutations_even_with_a_session():
    with TestClient(app) as client:
        for origin in [None, "https://attacker.example", "null"]:
            headers = {} if origin is None else {"Origin": origin}
            result = client.post("/auth/login", headers=headers, json={"username":"owner","password":PASSWORD})
            assert result.status_code == 403
        assert login(client).status_code == 200
        assert client.post("/auth/logout").status_code == 403
        assert client.post("/auth/logout", headers={"Origin":"https://attacker.example"}).status_code == 403
        assert client.get("/auth/session").status_code == 200


def test_login_throttle_is_persistent_and_wrong_user_is_generic():
    with TestClient(app) as client:
        for index in range(10):
            # New client per attempt: throttling is not a browser/session or process counter.
            with TestClient(app) as attempt:
                result = login(attempt, password="incorrect-password", username="nobody" if index % 2 else "owner")
                assert result.status_code == 401
                assert result.json() == {"detail": "Usuario o contraseña incorrectos"}
        limited = login(client)
        assert limited.status_code == 429 and int(limited.headers["retry-after"]) > 0
        with SessionLocal() as db:
            throttle = db.get(LoginThrottle, 1)
            throttle.window_started_at = utcnow() - timedelta(minutes=16)
            db.commit()
        assert login(client).status_code == 200


def test_failed_login_no_session_and_configuration_fails_closed(monkeypatch):
    with TestClient(app) as client:
        assert login(client, password="incorrect-password").status_code == 401
        assert not client.cookies
        monkeypatch.setattr(settings, "owner_password_hash", "not-an-argon-hash")
        assert login(client).status_code == 503
        assert client.get("/routines").status_code == 401


def test_health_remains_public_and_preflight_has_cors():
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
        preflight = client.options("/workouts", headers={
            "Origin": ORIGIN, "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        })
        assert preflight.status_code == 200
        denied = client.get("/workouts", headers={"Origin": ORIGIN})
        assert denied.status_code == 401
        assert denied.headers["access-control-allow-origin"] == ORIGIN
