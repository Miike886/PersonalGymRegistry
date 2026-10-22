"""Single-owner authentication with revocable opaque sessions."""
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, SecretStr
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlalchemy import CheckConstraint, DateTime, Integer, String, delete, select
from sqlalchemy.orm import Mapped, Session, mapped_column
from sqlalchemy.exc import IntegrityError

from .config import settings
from .database import Base, get_db

password_hasher = PasswordHash.recommended()
router = APIRouter(prefix="/auth", tags=["Authentication"])


class OwnerSession(Base):
    __tablename__ = "owner_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    credential_version: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class LoginThrottle(Base):
    __tablename__ = "login_throttle"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    window_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class OwnerAccount(Base):
    __tablename__ = "owner_account"
    __table_args__ = (CheckConstraint("id = 1", name="ck_single_owner"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(512))


class LoginInput(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: SecretStr = Field(min_length=1, max_length=128)
    remember: bool = True


class OwnerOut(BaseModel):
    username: str


class RegisterInput(LoginInput):
    username: str = Field(min_length=1, max_length=100, pattern=r"^\S(?:.*\S)?$")
    password: SecretStr = Field(min_length=12, max_length=128)
    setup_token: SecretStr = Field(min_length=20, max_length=256)


def credentials(db: Session):
    account = db.get(OwnerAccount, 1)
    return (account.username, account.password_hash) if account else (settings.owner_username, settings.owner_password_hash)


def utcnow():
    return datetime.now(timezone.utc)


def as_utc(value: datetime):
    # SQLite returns naive datetimes; PostgreSQL retains the timezone.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def cookie_name():
    return "__Host-gym_session" if settings.app_env == "production" else "gym_session"


def digest(token: str):
    return hashlib.sha256(token.encode()).hexdigest()


def credential_version(username: str, password_hash: str):
    return digest(username + "\0" + password_hash)


def require_owner(request: Request, db: Session = Depends(get_db)):
    if request.method == "OPTIONS":
        return
    if request.method not in {"GET", "HEAD"}:
        origins = {origin.strip() for origin in settings.cors_origins.split(",")}
        if request.headers.get("origin") not in origins:
            raise HTTPException(403, "Origen no autorizado")
    if request.url.path in {"/health", "/auth/login", "/auth/logout", "/auth/registration", "/auth/register"}:
        return
    token = request.cookies.get(cookie_name(), "")
    session = db.get(OwnerSession, digest(token)) if token and len(token) <= 128 else None
    username, password_hash = credentials(db)
    if (
        not password_hash
        or session is None
        or as_utc(session.expires_at) <= utcnow()
        or not hmac.compare_digest(session.credential_version, credential_version(username, password_hash))
    ):
        raise HTTPException(401, "Inicia sesión para continuar")


@router.post("/login", response_model=OwnerOut)
def login(body: LoginInput, response: Response, db: Session = Depends(get_db)):
    # One persistent row serializes attempts across serverless instances.
    throttle = db.scalar(select(LoginThrottle).where(LoginThrottle.id == 1).with_for_update())
    if throttle is None:
        raise HTTPException(503, "Ejecuta las migraciones para habilitar el acceso")
    username, password_hash = credentials(db)
    if not password_hash:
        raise HTTPException(503, "El acceso privado aún no está configurado")
    now = utcnow()
    if as_utc(throttle.window_started_at) + timedelta(minutes=15) <= now:
        throttle.attempts = 0
        throttle.window_started_at = now
    if throttle.attempts >= 10:
        retry_after = max(1, int((as_utc(throttle.window_started_at) + timedelta(minutes=15) - now).total_seconds()))
        raise HTTPException(429, "Demasiados intentos. Inténtalo más tarde.", headers={"Retry-After": str(retry_after)})
    try:
        valid_password = password_hasher.verify(body.password.get_secret_value(), password_hash)
    except (ValueError, UnknownHashError):
        raise HTTPException(503, "Revisa la configuración del acceso privado") from None
    valid_username = hmac.compare_digest(body.username.encode(), username.encode())
    if not (valid_password and valid_username):
        throttle.attempts += 1
        db.commit()
        raise HTTPException(401, "Usuario o contraseña incorrectos")
    throttle.attempts = 0
    return create_session(response, db, username, password_hash, body.remember)


def create_session(response: Response, db: Session, username: str, password_hash: str, remember: bool):
    now = utcnow()
    token = secrets.token_urlsafe(32)
    seconds = max(1, min(settings.session_days, 90)) * 86400 if remember else 12 * 3600
    db.execute(delete(OwnerSession).where(OwnerSession.expires_at <= now))
    db.add(OwnerSession(token_hash=digest(token), credential_version=credential_version(username, password_hash), expires_at=now + timedelta(seconds=seconds)))
    db.commit()
    response.set_cookie(
        cookie_name(), token, max_age=seconds if remember else None,
        httponly=True, secure=settings.app_env == "production", samesite="lax", path="/",
    )
    return OwnerOut(username=username)


def registration_enabled(db: Session):
    return 20 <= len(settings.owner_setup_token) <= 256 and db.get(OwnerAccount, 1) is None


@router.get("/registration")
def registration_status(db: Session = Depends(get_db)):
    return {"available": registration_enabled(db), "configured": bool(credentials(db)[1])}


@router.post("/register", response_model=OwnerOut, status_code=201)
def register(body: RegisterInput, response: Response, db: Session = Depends(get_db)):
    # Share the persistent lock with login so concurrent claims cannot replace the owner.
    throttle = db.scalar(select(LoginThrottle).where(LoginThrottle.id == 1).with_for_update())
    if throttle is None:
        raise HTTPException(503, "Ejecuta las migraciones para habilitar el acceso")
    if not registration_enabled(db):
        raise HTTPException(409, "El registro de la cuenta propietaria está cerrado")
    now = utcnow()
    if as_utc(throttle.window_started_at) + timedelta(minutes=15) <= now:
        throttle.attempts = 0
        throttle.window_started_at = now
    if throttle.attempts >= 10:
        raise HTTPException(429, "Demasiados intentos. Inténtalo más tarde.")
    if not hmac.compare_digest(body.setup_token.get_secret_value().encode(), settings.owner_setup_token.encode()):
        throttle.attempts += 1
        db.commit()
        raise HTTPException(403, "Código de activación incorrecto")
    password_hash = password_hasher.hash(body.password.get_secret_value())
    db.add(OwnerAccount(id=1, username=body.username, password_hash=password_hash))
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "El registro de la cuenta propietaria está cerrado") from None
    db.execute(delete(OwnerSession))
    throttle.attempts = 0
    return create_session(response, db, body.username, password_hash, body.remember)


@router.get("/session", response_model=OwnerOut)
def current_owner(db: Session = Depends(get_db)):
    return OwnerOut(username=credentials(db)[0])


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(cookie_name(), "")
    if token and len(token) <= 128:
        db.execute(delete(OwnerSession).where(OwnerSession.token_hash == digest(token)))
        db.commit()
    response.delete_cookie(cookie_name(), httponly=True, secure=settings.app_env == "production", samesite="lax", path="/")
