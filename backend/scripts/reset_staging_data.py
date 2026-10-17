import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import sys
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.audit_log import AuditLog
from app.models.basket_type import BasketType
from app.models.basket_type_item import BasketTypeItem
from app.models.benefit import Benefit
from app.models.delivery import Delivery
from app.models.delivery_schedule import DeliverySchedule
from app.models.family import Family
from app.models.family_contact import FamilyContact
from app.models.item import Item
from app.models.item_category import ItemCategory
from app.models.item_image import ItemImage
from app.models.login_rate_limit import LoginRateLimit
from app.models.person import Person
from app.models.role import Role
from app.models.social_assessment import SocialAssessment
from app.models.stock_batch import StockBatch
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.models.user_role import UserRole
from scripts.seed_initial_data import DEFAULT_ITEM_CATEGORIES


RESET_MODELS = (
    AuditLog,
    StockMovement,
    Delivery,
    DeliverySchedule,
    BasketTypeItem,
    StockBatch,
    ItemImage,
    Item,
    BasketType,
    Benefit,
    SocialAssessment,
    Person,
    FamilyContact,
    Family,
    ItemCategory,
    LoginRateLimit,
)


def parse_utc_timestamp(value: str) -> datetime:
    normalized = value.strip()
    if normalized.endswith("Z"):
        normalized = f"{normalized[:-1]}+00:00"
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        raise RuntimeError("A evidencia de restore deve usar data UTC com fuso horario.")
    return parsed.astimezone(timezone.utc)


def load_json_file(path: Path, label: str) -> dict[str, Any]:
    resolved = path.resolve(strict=True)
    if not resolved.is_file():
        raise RuntimeError(f"{label} deve apontar para um arquivo.")
    try:
        payload = json.loads(resolved.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"{label} invalido: {exc}") from exc
    if not isinstance(payload, dict):
        raise RuntimeError(f"{label} deve conter um objeto JSON.")
    return payload


def validate_recovery_evidence(
    *,
    database_name: str,
    manifest_path: Path,
    restore_evidence_path: Path,
    now: datetime | None = None,
    max_age_hours: int = 24,
) -> dict[str, str]:
    manifest = load_json_file(manifest_path, "Manifesto de backup")
    evidence = load_json_file(restore_evidence_path, "Evidencia de restore")

    if manifest.get("schema_version") != 2:
        raise RuntimeError("O reset exige manifesto de backup schema_version 2.")
    if evidence.get("schema_version") != 2:
        raise RuntimeError("O reset exige evidencia de restore schema_version 2.")
    if manifest.get("source_database") != database_name:
        raise RuntimeError("O manifesto pertence a outro banco de origem.")
    if evidence.get("source_database") != database_name:
        raise RuntimeError("A evidencia de restore pertence a outro banco de origem.")
    if evidence.get("result") != "success":
        raise RuntimeError("A evidencia nao registra um restore concluido com sucesso.")
    if evidence.get("verification_mode") != "exact-manifest-v2":
        raise RuntimeError("O restore nao foi verificado contra o inventario exato do manifesto v2.")

    target_database = str(evidence.get("target_database") or "")
    if not target_database or target_database.casefold() == database_name.casefold():
        raise RuntimeError("O restore deve ter sido provado em um banco isolado.")

    dump = manifest.get("dump")
    dump_file_name = str(dump.get("file_name") if isinstance(dump, dict) else "")
    if not dump_file_name or Path(dump_file_name).name != dump_file_name:
        raise RuntimeError("O manifesto nao informa um nome de dump seguro.")
    dump_path = manifest_path.resolve().parent / dump_file_name
    if not dump_path.is_file():
        raise RuntimeError("O arquivo de backup associado ao manifesto nao esta disponivel.")

    expected_dump_size = dump.get("size_bytes") if isinstance(dump, dict) else None
    if not isinstance(expected_dump_size, int) or expected_dump_size <= 0:
        raise RuntimeError("O manifesto nao informa um tamanho de dump valido.")
    if dump_path.stat().st_size != expected_dump_size:
        raise RuntimeError("O tamanho atual do dump diverge do manifesto.")

    manifest_dump_sha = str(dump.get("sha256") if isinstance(dump, dict) else "").upper()
    evidence_dump_sha = str(evidence.get("dump_sha256") or "").upper()
    if not manifest_dump_sha or manifest_dump_sha != evidence_dump_sha:
        raise RuntimeError("O checksum do dump diverge entre manifesto e evidencia.")
    current_dump_sha = hashlib.sha256(dump_path.read_bytes()).hexdigest().upper()
    if current_dump_sha != manifest_dump_sha:
        raise RuntimeError("O arquivo de backup atual diverge do checksum do manifesto.")

    if evidence.get("backup_file") != dump_file_name:
        raise RuntimeError("A evidencia de restore referencia outro arquivo de backup.")
    if evidence.get("size_bytes") != expected_dump_size:
        raise RuntimeError("O tamanho do dump diverge entre manifesto e evidencia.")
    if evidence.get("mysql_exit_code") != 0:
        raise RuntimeError("A evidencia de restore nao confirma exit code zero do MySQL.")

    manifest_sha = hashlib.sha256(manifest_path.resolve().read_bytes()).hexdigest().upper()
    evidence_manifest_sha = str(evidence.get("manifest_sha256") or "").upper()
    if not evidence_manifest_sha or manifest_sha != evidence_manifest_sha:
        raise RuntimeError("O checksum do manifesto diverge da evidencia de restore.")

    completed_at_value = str(evidence.get("completed_at_utc") or "")
    if not completed_at_value:
        raise RuntimeError("A evidencia nao informa completed_at_utc.")
    completed_at = parse_utc_timestamp(completed_at_value)
    current_time = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    if completed_at > current_time + timedelta(minutes=5):
        raise RuntimeError("A evidencia de restore possui data futura invalida.")
    if current_time - completed_at > timedelta(hours=max_age_hours):
        raise RuntimeError(
            f"A evidencia de restore tem mais de {max_age_hours} hora(s); gere uma nova prova."
        )

    return {
        "source_database": database_name,
        "target_database": target_database,
        "dump_sha256": manifest_dump_sha,
        "completed_at_utc": completed_at.isoformat(),
    }


def ensure_execution_allowed(
    *,
    app_env: str,
    database_name: str,
    confirmed_database: str | None,
) -> None:
    if app_env != "staging":
        raise RuntimeError("Reset recusado: APP_ENV deve ser staging.")
    if confirmed_database != database_name:
        raise RuntimeError("Reset recusado: --confirm-database deve ser o DB_NAME exato.")


def active_admin_ids(db: Session) -> list[int]:
    return list(
        db.scalars(
            select(User.id)
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(Role.name == "admin", User.is_active.is_(True))
            .order_by(User.id)
        ).all()
    )


def collect_reset_counts(db: Session) -> dict[str, int]:
    counts = {
        model.__tablename__: int(db.scalar(select(func.count()).select_from(model)) or 0)
        for model in RESET_MODELS
    }
    admin_ids = active_admin_ids(db)
    counts["non_admin_user_roles"] = int(
        db.scalar(
            select(func.count())
            .select_from(UserRole)
            .where(UserRole.user_id.not_in(admin_ids))
        )
        or 0
    )
    counts["non_admin_users"] = int(
        db.scalar(select(func.count()).select_from(User).where(User.id.not_in(admin_ids)))
        or 0
    )
    counts["preserved_active_admins"] = len(admin_ids)
    return counts


def reset_staging_records(db: Session) -> dict[str, int]:
    admin_ids = active_admin_ids(db)
    if not admin_ids:
        raise RuntimeError("Reset recusado: nenhum administrador ativo seria preservado.")

    counts = collect_reset_counts(db)
    try:
        for model in RESET_MODELS:
            db.execute(delete(model))

        db.execute(delete(UserRole).where(UserRole.user_id.not_in(admin_ids)))
        db.execute(delete(User).where(User.id.not_in(admin_ids)))

        for name, description in DEFAULT_ITEM_CATEGORIES:
            db.add(ItemCategory(name=name, description=description, is_active=True))

        db.add(
            AuditLog(
                event_type="system.staging_reset_completed",
                entity_type="system",
                details={
                    "removed_records": counts,
                    "preserved_active_admins": len(admin_ids),
                },
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return counts


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Limpa dados de homologacao preservando administradores ativos."
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Executa a limpeza; sem esta flag o comando opera somente em simulacao.",
    )
    parser.add_argument("--confirm-database")
    parser.add_argument("--backup-manifest", type=Path)
    parser.add_argument("--restore-evidence", type=Path)
    parser.add_argument("--max-evidence-age-hours", type=int, default=24)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if settings.app_env != "staging":
        raise RuntimeError("Reset recusado: APP_ENV deve ser staging, inclusive na simulacao.")

    db = SessionLocal()
    try:
        counts = collect_reset_counts(db)
        if not args.execute:
            print(json.dumps({"mode": "dry-run", "database": settings.db_name, "counts": counts}, indent=2))
            return

        ensure_execution_allowed(
            app_env=settings.app_env,
            database_name=settings.db_name,
            confirmed_database=args.confirm_database,
        )
        if args.backup_manifest is None or args.restore_evidence is None:
            raise RuntimeError(
                "--backup-manifest e --restore-evidence sao obrigatorios com --execute."
            )
        if args.max_evidence_age_hours < 1:
            raise RuntimeError("--max-evidence-age-hours deve ser maior que zero.")
        recovery = validate_recovery_evidence(
            database_name=settings.db_name,
            manifest_path=args.backup_manifest,
            restore_evidence_path=args.restore_evidence,
            max_age_hours=args.max_evidence_age_hours,
        )
        removed = reset_staging_records(db)
        print(
            json.dumps(
                {
                    "mode": "executed",
                    "database": settings.db_name,
                    "restore_target": recovery["target_database"],
                    "removed": removed,
                    "default_categories_created": len(DEFAULT_ITEM_CATEGORIES),
                },
                indent=2,
            )
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
