"""Prepare the database safely before starting the HTTP service.

Render's free plan does not provide a pre-deploy command.  This runner keeps a
MySQL advisory lock open while it checks/applies Alembic migrations and runs
the idempotent seed.  The web server replaces this process only after every
database preparation step succeeds.
"""

from __future__ import annotations

import hashlib
import logging
import os
from pathlib import Path
import subprocess
import sys
from typing import Callable, Sequence

from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import text


BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import engine


LOGGER = logging.getLogger("cesta.startup")
LOCK_PREFIX = "cesta-startup-"
DEFAULT_LOCK_TIMEOUT_SECONDS = 120
ALEMBIC_UPGRADE_COMMAND = (sys.executable, "-m", "alembic", "upgrade", "head")
SEED_COMMAND = (sys.executable, "scripts/seed_initial_data.py")


def _read_bounded_integer(
    variable_name: str,
    default: int,
    minimum: int,
    maximum: int,
) -> int:
    raw_value = os.getenv(variable_name, str(default)).strip()
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{variable_name} deve ser um numero inteiro.") from exc

    if not minimum <= value <= maximum:
        raise RuntimeError(
            f"{variable_name} deve estar entre {minimum} e {maximum}."
        )
    return value


def build_lock_name(database_url) -> str:
    """Build a stable lock identifier without logging connection credentials."""

    identity = "|".join(
        (
            str(database_url.host or ""),
            str(database_url.port or ""),
            str(database_url.database or ""),
        )
    )
    digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:40]
    return f"{LOCK_PREFIX}{digest}"


def get_code_revision_state() -> tuple[frozenset[str], frozenset[str]]:
    alembic_config = Config(str(BACKEND_DIR / "alembic.ini"))
    script_directory = ScriptDirectory.from_config(alembic_config)
    heads = frozenset(script_directory.get_heads())
    known_revisions = frozenset(
        revision.revision for revision in script_directory.walk_revisions()
    )

    if len(heads) != 1:
        raise RuntimeError(
            "O codigo precisa possuir exatamente um head Alembic antes do startup."
        )
    return heads, known_revisions


def get_database_heads(connection) -> frozenset[str]:
    connection.commit()
    context = MigrationContext.configure(connection)
    return frozenset(context.get_current_heads())


def acquire_startup_lock(connection, lock_name: str, timeout_seconds: int) -> None:
    result = connection.execute(
        text("SELECT GET_LOCK(:lock_name, :timeout_seconds)"),
        {"lock_name": lock_name, "timeout_seconds": timeout_seconds},
    ).scalar_one_or_none()
    connection.commit()
    if result != 1:
        if result == 0:
            raise RuntimeError(
                "Timeout ao aguardar o lock de preparacao do banco de dados."
            )
        raise RuntimeError("Nao foi possivel adquirir o lock de preparacao do banco.")


def release_startup_lock(connection, lock_name: str) -> None:
    result = connection.execute(
        text("SELECT RELEASE_LOCK(:lock_name)"),
        {"lock_name": lock_name},
    ).scalar_one_or_none()
    connection.commit()
    if result != 1:
        raise RuntimeError("Nao foi possivel liberar o lock de preparacao do banco.")


def run_checked(command: Sequence[str]) -> None:
    subprocess.run(
        list(command),
        cwd=BACKEND_DIR,
        check=True,
    )


def prepare_database(
    database_engine=engine,
    command_runner: Callable[[Sequence[str]], None] = run_checked,
) -> None:
    timeout_seconds = _read_bounded_integer(
        "STARTUP_DB_LOCK_TIMEOUT_SECONDS",
        DEFAULT_LOCK_TIMEOUT_SECONDS,
        1,
        600,
    )
    lock_name = build_lock_name(database_engine.url)

    with database_engine.connect() as connection:
        acquire_startup_lock(connection, lock_name, timeout_seconds)
        primary_error: BaseException | None = None
        try:
            code_heads, known_revisions = get_code_revision_state()
            database_heads = get_database_heads(connection)
            unknown_heads = database_heads - known_revisions
            if unknown_heads:
                raise RuntimeError(
                    "O banco aponta para revisao Alembic desconhecida pelo codigo atual."
                )

            if database_heads != code_heads:
                LOGGER.info("Migracao pendente detectada; aplicando upgrade Alembic.")
                command_runner(ALEMBIC_UPGRADE_COMMAND)
            else:
                LOGGER.info("Banco ja esta no head Alembic esperado.")

            verified_heads = get_database_heads(connection)
            if verified_heads != code_heads:
                raise RuntimeError(
                    "Os heads Alembic do banco divergiram do codigo apos o upgrade."
                )

            command_runner(SEED_COMMAND)
            LOGGER.info("Migracoes e seed verificados; banco pronto para o servico.")
        except BaseException as exc:
            primary_error = exc
            raise
        finally:
            try:
                release_startup_lock(connection, lock_name)
            except Exception:
                if primary_error is None:
                    raise
                LOGGER.exception("Falha adicional ao liberar o lock de startup.")


def exec_server() -> None:
    port = _read_bounded_integer("PORT", 8000, 1, 65535)
    command = (
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        str(port),
    )
    os.execvp(command[0], list(command))


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    try:
        prepare_database()
        exec_server()
    except Exception:
        LOGGER.exception("Startup recusado: a preparacao segura nao foi concluida.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
