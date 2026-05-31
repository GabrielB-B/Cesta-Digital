from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

database_url = URL.create(
    drivername="mysql+pymysql",
    username=settings.db_user,
    password=settings.db_password,
    host=settings.db_host,
    port=settings.db_port,
    database=settings.db_name,
)

database_connect_args = {
    "connect_timeout": settings.db_connect_timeout_seconds,
    "read_timeout": settings.db_read_timeout_seconds,
    "write_timeout": settings.db_write_timeout_seconds,
}
if settings.db_ssl_required:
    database_connect_args["ssl"] = {"verify_mode": "none"}
    if settings.db_ssl_ca:
        database_connect_args["ssl"]["ca"] = settings.db_ssl_ca
        database_connect_args["ssl"]["verify_mode"] = "required"

engine = create_engine(
    database_url,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_timeout=settings.db_connect_timeout_seconds,
    connect_args=database_connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_db_connection() -> bool:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return True
