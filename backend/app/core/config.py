from decimal import Decimal

from dotenv import load_dotenv
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    app_name: str = "Cesta Digital API"
    app_version: str = "0.1.0"
    app_env: str = "development"
    log_level: str = "INFO"
    frontend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    bootstrap_admin_enabled: bool = True

    db_host: str
    db_port: int = 3306
    db_name: str
    db_user: str
    db_password: str
    db_ssl_required: bool = False
    db_ssl_ca: str | None = None
    db_connect_timeout_seconds: int = 10
    db_read_timeout_seconds: int = 30
    db_write_timeout_seconds: int = 30

    first_admin_name: str
    first_admin_login_name: str = "admin"
    first_admin_email: str
    first_admin_password: str

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    auth_cookie_name: str = "cesta_digital_session"
    auth_cookie_samesite: str = "lax"
    login_rate_limit_attempts: int = 5
    login_rate_limit_window_seconds: int = 300
    login_rate_limit_lockout_seconds: int = 900
    extreme_poverty_max_income_per_capita: Decimal = Decimal("109")
    poverty_max_income_per_capita: Decimal = Decimal("218")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("app_env")
    @classmethod
    def validate_app_env(cls, value: str) -> str:
        normalized = value.strip().lower()
        allowed_values = {"development", "test", "staging", "production"}
        if normalized not in allowed_values:
            raise ValueError(
                "APP_ENV deve ser development, test, staging ou production."
            )
        return normalized

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, value: str) -> str:
        normalized = value.strip().upper()
        allowed_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if normalized not in allowed_levels:
            raise ValueError(
                "LOG_LEVEL deve ser DEBUG, INFO, WARNING, ERROR ou CRITICAL."
            )
        return normalized

    @field_validator("first_admin_login_name")
    @classmethod
    def validate_first_admin_login_name(cls, value: str) -> str:
        normalized = value.strip().lower()
        if len(normalized) < 3:
            raise ValueError("FIRST_ADMIN_LOGIN_NAME deve ter pelo menos 3 caracteres.")
        return normalized

    @model_validator(mode="after")
    def validate_security_runtime(self):
        if self.app_env in {"staging", "production"} and len(self.secret_key.strip()) < 32:
            raise ValueError(
                "SECRET_KEY deve ter pelo menos 32 caracteres fora do ambiente local."
            )

        if self.app_env in {"staging", "production"} and not self.db_ssl_required:
            raise ValueError(
                "DB_SSL_REQUIRED deve permanecer ativo em staging e production."
            )

        if self.login_rate_limit_attempts < 1:
            raise ValueError("LOGIN_RATE_LIMIT_ATTEMPTS deve ser maior que zero.")

        if self.login_rate_limit_window_seconds < 1:
            raise ValueError(
                "LOGIN_RATE_LIMIT_WINDOW_SECONDS deve ser maior que zero."
            )

        if self.login_rate_limit_lockout_seconds < 1:
            raise ValueError(
                "LOGIN_RATE_LIMIT_LOCKOUT_SECONDS deve ser maior que zero."
            )

        if self.auth_cookie_samesite.lower() not in {"lax", "strict", "none"}:
            raise ValueError("AUTH_COOKIE_SAMESITE deve ser lax, strict ou none.")

        if self.db_connect_timeout_seconds < 1:
            raise ValueError("DB_CONNECT_TIMEOUT_SECONDS deve ser maior que zero.")

        if self.db_read_timeout_seconds < 1:
            raise ValueError("DB_READ_TIMEOUT_SECONDS deve ser maior que zero.")

        if self.db_write_timeout_seconds < 1:
            raise ValueError("DB_WRITE_TIMEOUT_SECONDS deve ser maior que zero.")

        return self

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.frontend_cors_origins.split(",")
            if origin.strip()
        ]

    @property
    def auth_cookie_secure(self) -> bool:
        return self.app_env in {"staging", "production"}


settings = Settings()
