from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    database_url: str = "sqlite:///./gym_tracker.db"
    app_env: str = "development"
    owner_username: str = Field(default="owner", min_length=1, max_length=100)
    owner_password_hash: str = Field(default="", repr=False)
    session_days: int = Field(default=30, ge=1, le=90)
    cors_origins: str = "http://localhost:5173"
    allowed_hosts: str = "localhost,127.0.0.1,testserver"
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")


settings = Settings()
