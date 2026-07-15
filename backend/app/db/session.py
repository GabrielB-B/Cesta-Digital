from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.tls import build_database_ssl_context

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
database_ssl_context = build_database_ssl_context(
    ssl_required=settings.db_ssl_required,
    ca_source=settings.db_ssl_ca,
)
if database_ssl_context is not None:
    database_connect_args["ssl"] = database_ssl_context

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
