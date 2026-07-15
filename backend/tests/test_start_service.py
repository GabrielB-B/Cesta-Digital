import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import Mock, patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.update(
    {
        "APP_ENV": "test",
        "DB_HOST": "127.0.0.1",
        "DB_NAME": "cesta_test",
        "DB_USER": "cesta_test",
        "DB_PASSWORD": "cesta_test",
        "DB_SSL_REQUIRED": "false",
        "FIRST_ADMIN_NAME": "Administrador",
        "FIRST_ADMIN_EMAIL": "admin@example.invalid",
        "FIRST_ADMIN_PASSWORD": "SenhaUnica@123",
        "SECRET_KEY": "test-secret-key",
    }
)

from scripts import start_service


class _ConnectionContext:
    def __init__(self, connection):
        self.connection = connection

    def __enter__(self):
        return self.connection

    def __exit__(self, _exc_type, _exc_value, _traceback):
        return False


class StartupRunnerTests(unittest.TestCase):
    def setUp(self):
        self.connection = Mock()
        self.engine = Mock()
        self.engine.url.host = "db.internal"
        self.engine.url.port = 3306
        self.engine.url.database = "cesta"
        self.engine.connect.return_value = _ConnectionContext(self.connection)

    @patch.dict(os.environ, {"STARTUP_DB_LOCK_TIMEOUT_SECONDS": "15"})
    def test_skips_upgrade_when_database_is_already_at_head(self):
        commands = []
        events = []

        with (
            patch.object(
                start_service,
                "acquire_startup_lock",
                side_effect=lambda *_args: events.append("lock"),
            ),
            patch.object(
                start_service,
                "release_startup_lock",
                side_effect=lambda *_args: events.append("release"),
            ),
            patch.object(
                start_service,
                "get_code_revision_state",
                return_value=(frozenset({"head"}), frozenset({"base", "head"})),
            ),
            patch.object(
                start_service,
                "get_database_heads",
                side_effect=[frozenset({"head"}), frozenset({"head"})],
            ),
        ):
            start_service.prepare_database(
                self.engine,
                command_runner=lambda command: commands.append(tuple(command)),
            )

        self.assertEqual(commands, [start_service.SEED_COMMAND])
        self.assertEqual(events, ["lock", "release"])

    def test_upgrade_runs_before_seed_and_final_head_is_verified(self):
        commands = []

        with (
            patch.object(start_service, "acquire_startup_lock"),
            patch.object(start_service, "release_startup_lock"),
            patch.object(
                start_service,
                "get_code_revision_state",
                return_value=(frozenset({"head"}), frozenset({"base", "head"})),
            ),
            patch.object(
                start_service,
                "get_database_heads",
                side_effect=[frozenset({"base"}), frozenset({"head"})],
            ) as get_heads,
        ):
            start_service.prepare_database(
                self.engine,
                command_runner=lambda command: commands.append(tuple(command)),
            )

        self.assertEqual(
            commands,
            [start_service.ALEMBIC_UPGRADE_COMMAND, start_service.SEED_COMMAND],
        )
        self.assertEqual(get_heads.call_count, 2)

    def test_unknown_database_revision_aborts_before_commands(self):
        commands = []

        with (
            patch.object(start_service, "acquire_startup_lock"),
            patch.object(start_service, "release_startup_lock") as release_lock,
            patch.object(
                start_service,
                "get_code_revision_state",
                return_value=(frozenset({"head"}), frozenset({"base", "head"})),
            ),
            patch.object(
                start_service,
                "get_database_heads",
                return_value=frozenset({"other-branch"}),
            ),
        ):
            with self.assertRaisesRegex(RuntimeError, "revisao Alembic desconhecida"):
                start_service.prepare_database(
                    self.engine,
                    command_runner=lambda command: commands.append(tuple(command)),
                )

        self.assertEqual(commands, [])
        release_lock.assert_called_once()

    def test_upgrade_failure_releases_lock_and_does_not_run_seed(self):
        commands = []

        def fail_upgrade(command):
            commands.append(tuple(command))
            raise subprocess.CalledProcessError(2, command)

        with (
            patch.object(start_service, "acquire_startup_lock"),
            patch.object(start_service, "release_startup_lock") as release_lock,
            patch.object(
                start_service,
                "get_code_revision_state",
                return_value=(frozenset({"head"}), frozenset({"base", "head"})),
            ),
            patch.object(
                start_service,
                "get_database_heads",
                return_value=frozenset({"base"}),
            ),
        ):
            with self.assertRaises(subprocess.CalledProcessError):
                start_service.prepare_database(
                    self.engine,
                    command_runner=fail_upgrade,
                )

        self.assertEqual(commands, [start_service.ALEMBIC_UPGRADE_COMMAND])
        release_lock.assert_called_once()

    def test_get_lock_timeout_and_error_are_rejected(self):
        for native_result, expected_message in (
            (0, "Timeout ao aguardar"),
            (None, "Nao foi possivel adquirir"),
        ):
            with self.subTest(native_result=native_result):
                result = Mock()
                result.scalar_one_or_none.return_value = native_result
                connection = Mock()
                connection.execute.return_value = result

                with self.assertRaisesRegex(RuntimeError, expected_message):
                    start_service.acquire_startup_lock(
                        connection,
                        "cesta-startup-test",
                        1,
                    )
                connection.commit.assert_called_once()

    def test_seed_failure_releases_lock_and_prevents_server_exec(self):
        with (
            patch.object(start_service, "prepare_database", side_effect=RuntimeError("seed")),
            patch.object(start_service, "exec_server") as exec_server,
        ):
            self.assertEqual(start_service.main(), 1)
        exec_server.assert_not_called()

    def test_server_exec_uses_validated_render_port(self):
        with (
            patch.dict(os.environ, {"PORT": "9123"}),
            patch.object(os, "execvp") as execvp,
        ):
            start_service.exec_server()

        executable = sys.executable
        execvp.assert_called_once_with(
            executable,
            [
                executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "0.0.0.0",
                "--port",
                "9123",
            ],
        )

    def test_lock_name_is_stable_and_does_not_include_credentials(self):
        database_url = Mock()
        database_url.host = "db.example"
        database_url.port = 3306
        database_url.database = "cesta"
        database_url.username = "private-user"
        database_url.password = "private-password"

        first = start_service.build_lock_name(database_url)
        second = start_service.build_lock_name(database_url)

        self.assertEqual(first, second)
        self.assertLessEqual(len(first), 64)
        self.assertNotIn("private-user", first)
        self.assertNotIn("private-password", first)


if __name__ == "__main__":
    unittest.main()
