from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_NAME", "cesta_digital_test")
os.environ.setdefault("DB_USER", "root")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("FIRST_ADMIN_NAME", "Admin")
os.environ.setdefault("FIRST_ADMIN_LOGIN_NAME", "admin")
os.environ.setdefault("FIRST_ADMIN_EMAIL", "admin@example.com")
os.environ.setdefault("FIRST_ADMIN_PASSWORD", "Admin@12345")
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-32-plus-chars")

from app.db.base import Base
from app.models.audit_log import AuditLog
from app.models.item_category import ItemCategory
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from scripts.reset_staging_data import (
    ensure_execution_allowed,
    reset_staging_records,
    validate_recovery_evidence,
)


class ResetStagingDataTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_execution_is_restricted_to_confirmed_staging_database(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "APP_ENV deve ser staging"):
            ensure_execution_allowed(
                app_env="production",
                database_name="cesta_staging",
                confirmed_database="cesta_staging",
            )

        with self.assertRaisesRegex(RuntimeError, "DB_NAME exato"):
            ensure_execution_allowed(
                app_env="staging",
                database_name="cesta_staging",
                confirmed_database="outro_banco",
            )

    def test_recovery_evidence_must_match_recent_isolated_restore(self) -> None:
        now = datetime(2026, 10, 17, 18, 0, tzinfo=timezone.utc)

        with tempfile.TemporaryDirectory() as temp_dir:
            dump_path = Path(temp_dir) / "backup.sql"
            manifest_path = Path(temp_dir) / "backup.manifest.json"
            evidence_path = Path(temp_dir) / "restore.json"
            dump_path.write_bytes(b"backup-verificado")
            dump_sha = hashlib.sha256(dump_path.read_bytes()).hexdigest().upper()
            manifest = {
                "schema_version": 2,
                "source_database": "cesta_staging",
                "dump": {
                    "file_name": dump_path.name,
                    "size_bytes": dump_path.stat().st_size,
                    "sha256": dump_sha,
                },
            }
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            manifest_sha = hashlib.sha256(manifest_path.read_bytes()).hexdigest().upper()
            evidence = {
                "schema_version": 2,
                "result": "success",
                "verification_mode": "exact-manifest-v2",
                "completed_at_utc": (now - timedelta(hours=1)).isoformat(),
                "source_database": "cesta_staging",
                "target_database": "cesta_restore_drill",
                "backup_file": dump_path.name,
                "size_bytes": dump_path.stat().st_size,
                "dump_sha256": dump_sha,
                "manifest_sha256": manifest_sha,
                "mysql_exit_code": 0,
            }
            evidence_path.write_text(json.dumps(evidence), encoding="utf-8")

            result = validate_recovery_evidence(
                database_name="cesta_staging",
                manifest_path=manifest_path,
                restore_evidence_path=evidence_path,
                now=now,
            )
            self.assertEqual(result["target_database"], "cesta_restore_drill")

            evidence["target_database"] = "cesta_staging"
            evidence_path.write_text(json.dumps(evidence), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "banco isolado"):
                validate_recovery_evidence(
                    database_name="cesta_staging",
                    manifest_path=manifest_path,
                    restore_evidence_path=evidence_path,
                    now=now,
                )

            evidence["target_database"] = "cesta_restore_drill"
            evidence_path.write_text(json.dumps(evidence), encoding="utf-8")
            dump_path.write_bytes(b"x" * dump_path.stat().st_size)
            with self.assertRaisesRegex(RuntimeError, "checksum do manifesto"):
                validate_recovery_evidence(
                    database_name="cesta_staging",
                    manifest_path=manifest_path,
                    restore_evidence_path=evidence_path,
                    now=now,
                )

    def test_reset_preserves_active_admin_and_recreates_default_categories(self) -> None:
        with self.session_factory() as db:
            admin_role = Role(name="admin", description="Administrador")
            collaborator_role = Role(name="colaborador", description="Colaborador")
            db.add_all([admin_role, collaborator_role])
            db.flush()

            admin = User(
                name="Administrador",
                login_name="admin",
                email="admin@example.invalid",
                password_hash="hash",
                is_active=True,
            )
            collaborator = User(
                name="Colaborador",
                login_name="colaborador",
                email="colaborador@example.invalid",
                password_hash="hash",
                is_active=True,
            )
            db.add_all([admin, collaborator])
            db.flush()
            db.add_all(
                [
                    UserRole(user_id=admin.id, role_id=admin_role.id),
                    UserRole(user_id=collaborator.id, role_id=collaborator_role.id),
                    ItemCategory(name="temporaria", description="Remover"),
                    AuditLog(event_type="test.before_reset"),
                ]
            )
            db.commit()

            removed = reset_staging_records(db)

            self.assertEqual(removed["non_admin_users"], 1)
            self.assertEqual(int(db.scalar(select(func.count()).select_from(User)) or 0), 1)
            self.assertEqual(db.scalar(select(User.login_name)), "admin")
            self.assertEqual(
                set(db.scalars(select(ItemCategory.name)).all()),
                {"alimentos", "higiene", "limpeza"},
            )
            self.assertEqual(
                db.scalar(select(AuditLog.event_type)),
                "system.staging_reset_completed",
            )

    def test_reset_refuses_to_remove_the_last_access_path(self) -> None:
        with self.session_factory() as db:
            db.add(Role(name="admin", description="Administrador"))
            db.commit()
            with self.assertRaisesRegex(RuntimeError, "nenhum administrador ativo"):
                reset_staging_records(db)


if __name__ == "__main__":
    unittest.main()
