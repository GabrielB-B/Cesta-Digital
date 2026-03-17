from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    app_name: str = "Cesta Digital API"
    app_version: str = "0.1.0"

    db_host: str
    db_port: int = 3306
    db_name: str
    db_user: str
    db_password: str

    first_admin_name: str
    first_admin_email: str
    first_admin_password: str

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()