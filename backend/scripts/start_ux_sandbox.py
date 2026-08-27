"""Inicia a API em um sandbox SQLite persistente para homologacao UX local.

Este processo nao usa o MySQL configurado para outros ambientes. Credenciais,
segredo de sessao, banco e logs ficam em ``.ux-sandbox/``, ignorado pelo Git.
"""

from __future__ import annotations

import argparse
from datetime import date, datetime, timedelta
from decimal import Decimal
import json
import os
from pathlib import Path
import secrets
import sys


BACKEND_DIR = Path(__file__).resolve().parents[1]
REPOSITORY_DIR = BACKEND_DIR.parent
DEFAULT_RUNTIME_DIR = REPOSITORY_DIR / ".ux-sandbox"
DEFAULT_DATABASE_PATH = DEFAULT_RUNTIME_DIR / "cesta-digital-ux.sqlite3"
DEFAULT_CREDENTIALS_PATH = DEFAULT_RUNTIME_DIR / "access.json"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="API Cesta Digital com dados sinteticos para homologacao UX local."
    )
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument(
        "--database",
        type=Path,
        default=DEFAULT_DATABASE_PATH,
    )
    parser.add_argument(
        "--frontend-origin",
        action="append",
        default=[],
        help="Origem adicional autorizada no CORS. Pode ser repetida.",
    )
    return parser.parse_args()


def load_or_create_access(runtime_dir: Path) -> dict[str, str]:
    runtime_dir.mkdir(parents=True, exist_ok=True)
    credentials_path = runtime_dir / DEFAULT_CREDENTIALS_PATH.name

    if credentials_path.exists():
        stored = json.loads(credentials_path.read_text(encoding="utf-8"))
        required = {"login_name", "password", "secret_key"}
        if required.issubset(stored):
            return {key: str(stored[key]) for key in required}
        raise RuntimeError(
            f"Credencial local incompleta em {credentials_path}. "
            "Remova somente esse arquivo para gerar um novo acesso."
        )

    access = {
        "login_name": "ux.admin",
        "password": f"UX#{secrets.token_urlsafe(12)}9a",
        "secret_key": secrets.token_urlsafe(48),
    }
    credentials_path.write_text(
        json.dumps(access, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return access


def configure_isolated_environment(
    access: dict[str, str],
    frontend_origins: list[str],
) -> None:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *frontend_origins,
    ]
    unique_origins = list(dict.fromkeys(origin.rstrip("/") for origin in origins))

    isolated_values = {
        "APP_ENV": "development",
        "LOG_LEVEL": "INFO",
        "FRONTEND_CORS_ORIGINS": ",".join(unique_origins),
        "DB_HOST": "ux-sandbox.invalid",
        "DB_PORT": "3306",
        "DB_NAME": "ux_sandbox_not_used",
        "DB_USER": "ux_sandbox_not_used",
        "DB_PASSWORD": "ux_sandbox_not_used",
        "DB_SSL_REQUIRED": "false",
        "FIRST_ADMIN_NAME": "Administrador UX",
        "FIRST_ADMIN_LOGIN_NAME": access["login_name"],
        "FIRST_ADMIN_EMAIL": "ux.admin@example.com",
        "FIRST_ADMIN_PASSWORD": access["password"],
        "SECRET_KEY": access["secret_key"],
        "AUTH_COOKIE_SAMESITE": "lax",
    }
    os.environ.update(isolated_values)


def seed_synthetic_data(session_factory, access: dict[str, str]) -> None:
    from sqlalchemy import select

    from app.core.security import get_password_hash
    from app.models.audit_log import AuditLog
    from app.models.basket_type import BasketType
    from app.models.basket_type_item import BasketTypeItem
    from app.models.delivery import Delivery
    from app.models.delivery_schedule import DeliverySchedule
    from app.models.family import Family
    from app.models.family_contact import FamilyContact
    from app.models.item import Item
    from app.models.item_category import ItemCategory
    from app.models.person import Person
    from app.models.role import Role
    from app.models.social_assessment import SocialAssessment
    from app.models.stock_batch import StockBatch
    from app.models.stock_movement import StockMovement
    from app.models.user import User
    from app.models.user_role import UserRole

    today = date.today()
    now = datetime.now()

    with session_factory() as db:
        if db.scalar(select(User.id).limit(1)) is not None:
            return

        roles = {
            name: Role(name=name, description=description)
            for name, description in (
                ("admin", "Administrador do sandbox UX"),
                ("lider_social", "Lideranca social do sandbox UX"),
                ("operador", "Operacao de estoque do sandbox UX"),
            )
        }
        db.add_all(roles.values())
        db.flush()

        shared_password_hash = get_password_hash(access["password"])
        users = {
            "admin": User(
                name="Administrador UX",
                login_name=access["login_name"],
                email="ux.admin@example.com",
                password_hash=shared_password_hash,
                is_active=True,
                last_login_at=now - timedelta(minutes=18),
            ),
            "social": User(
                name="Marina Social",
                login_name="ux.social",
                email="ux.social@example.com",
                password_hash=shared_password_hash,
                is_active=True,
                last_login_at=now - timedelta(hours=3),
            ),
            "operator": User(
                name="Caio Operacao",
                login_name="ux.operador",
                email="ux.operador@example.com",
                password_hash=shared_password_hash,
                is_active=True,
                last_login_at=now - timedelta(days=1),
            ),
        }
        db.add_all(users.values())
        db.flush()
        db.add_all(
            [
                UserRole(user_id=users["admin"].id, role_id=roles["admin"].id),
                UserRole(user_id=users["social"].id, role_id=roles["lider_social"].id),
                UserRole(user_id=users["operator"].id, role_id=roles["operador"].id),
            ]
        )

        categories = {
            name: ItemCategory(name=name, description=description, is_active=True)
            for name, description in (
                ("alimentos", "Alimentos e itens essenciais de cesta."),
                ("higiene", "Produtos de higiene pessoal."),
                ("limpeza", "Produtos de limpeza domestica."),
            )
        }
        db.add_all(categories.values())
        db.flush()

        items = {
            "rice": Item(
                category_id=categories["alimentos"].id,
                name="Arroz Branco 5kg",
                barcode="7896006711115",
                unit_measure="pacote",
                tracks_expiration=True,
                is_active=True,
                reference_unit_value=Decimal("28.90"),
                minimum_stock_alert=20,
                notes="Produto sintetico para homologacao UX.",
            ),
            "beans": Item(
                category_id=categories["alimentos"].id,
                name="Feijao Carioca 1kg",
                barcode="7896006722227",
                unit_measure="pacote",
                tracks_expiration=True,
                is_active=True,
                reference_unit_value=Decimal("8.75"),
                minimum_stock_alert=15,
            ),
            "oil": Item(
                category_id=categories["alimentos"].id,
                name="Oleo de Soja 900ml",
                barcode="7896006733338",
                unit_measure="frasco",
                tracks_expiration=True,
                is_active=True,
                reference_unit_value=Decimal("7.40"),
                minimum_stock_alert=12,
            ),
            "milk": Item(
                category_id=categories["alimentos"].id,
                name="Leite Integral 1L",
                barcode="7896006744449",
                unit_measure="caixa",
                tracks_expiration=True,
                is_active=True,
                reference_unit_value=Decimal("5.80"),
                minimum_stock_alert=30,
            ),
            "soap": Item(
                category_id=categories["higiene"].id,
                name="Sabonete Neutro 90g",
                barcode="7896006755550",
                unit_measure="unidade",
                tracks_expiration=False,
                is_active=True,
                reference_unit_value=Decimal("3.20"),
                minimum_stock_alert=18,
            ),
            "detergent": Item(
                category_id=categories["limpeza"].id,
                name="Detergente Neutro 500ml",
                barcode="7896006766661",
                unit_measure="frasco",
                tracks_expiration=False,
                is_active=True,
                reference_unit_value=Decimal("2.95"),
                minimum_stock_alert=10,
            ),
        }
        db.add_all(items.values())
        db.flush()

        batches = {
            "rice": StockBatch(
                item_id=items["rice"].id,
                batch_code="UX-ARZ-260827",
                source_type="doacao_item",
                status="disponivel",
                entry_quantity=70,
                current_quantity=64,
                entry_date=today - timedelta(days=9),
                expiration_date=today + timedelta(days=310),
                storage_location="Prateleira A1",
                estimated_unit_value=Decimal("28.90"),
                created_by_user_id=users["operator"].id,
            ),
            "beans": StockBatch(
                item_id=items["beans"].id,
                batch_code="UX-FEJ-260827",
                source_type="doacao_item",
                status="disponivel",
                entry_quantity=45,
                current_quantity=43,
                entry_date=today - timedelta(days=7),
                expiration_date=today + timedelta(days=220),
                storage_location="Prateleira A2",
                estimated_unit_value=Decimal("8.75"),
                created_by_user_id=users["operator"].id,
            ),
            "oil": StockBatch(
                item_id=items["oil"].id,
                batch_code="UX-OLE-260827",
                source_type="doacao_item",
                status="disponivel",
                entry_quantity=30,
                current_quantity=30,
                entry_date=today - timedelta(days=5),
                expiration_date=today + timedelta(days=8),
                storage_location="Prateleira B1",
                estimated_unit_value=Decimal("7.40"),
                created_by_user_id=users["operator"].id,
            ),
            "milk": StockBatch(
                item_id=items["milk"].id,
                batch_code="UX-LEI-260827",
                source_type="doacao_item",
                status="disponivel",
                entry_quantity=24,
                current_quantity=24,
                entry_date=today - timedelta(days=3),
                expiration_date=today + timedelta(days=35),
                storage_location="Prateleira B2",
                estimated_unit_value=Decimal("5.80"),
                created_by_user_id=users["admin"].id,
            ),
            "soap": StockBatch(
                item_id=items["soap"].id,
                batch_code="UX-SAB-260827",
                source_type="doacao_item",
                status="disponivel",
                entry_quantity=50,
                current_quantity=50,
                entry_date=today - timedelta(days=2),
                expiration_date=None,
                storage_location="Prateleira C1",
                estimated_unit_value=Decimal("3.20"),
                created_by_user_id=users["admin"].id,
            ),
            "detergent": StockBatch(
                item_id=items["detergent"].id,
                batch_code="UX-DET-260827",
                source_type="doacao_item",
                status="disponivel",
                entry_quantity=38,
                current_quantity=38,
                entry_date=today - timedelta(days=1),
                expiration_date=None,
                storage_location="Prateleira C2",
                estimated_unit_value=Decimal("2.95"),
                created_by_user_id=users["operator"].id,
            ),
        }
        db.add_all(batches.values())
        db.flush()

        families: list[Family] = []
        family_specs = (
            ("FAM-UX-0001", "apta_recorrente", "Maria Oliveira", "Jardim Primavera", Decimal("850.00"), 4),
            ("FAM-UX-0002", "apta_emergencial", "Joana Santos", "Vila Nova", Decimal("620.00"), 3),
            ("FAM-UX-0003", "em_analise", "Carlos Pereira", "Centro", Decimal("1450.00"), 5),
            ("FAM-UX-0004", "inativa", "Luciana Costa", "Jardim Europa", Decimal("1900.00"), 2),
        )
        for index, (code, status, responsible, neighborhood, income, residents) in enumerate(
            family_specs,
            start=1,
        ):
            per_capita = (income / residents).quantize(Decimal("0.01"))
            family = Family(
                internal_code=code,
                status=status,
                registration_date=today - timedelta(days=210 - (index * 13)),
                last_evaluation_date=(today - timedelta(days=170)) if index <= 2 else None,
                next_revaluation_date=(today + timedelta(days=10 + index)) if index <= 2 else None,
                monthly_income_total=income,
                monthly_essential_expenses=Decimal("540.00"),
                income_per_capita=per_capita,
                receives_government_assistance=index <= 2,
                housing_type="alugada" if index != 2 else "cedida",
                has_water_supply=True,
                has_electricity=True,
                has_sanitation=index != 2,
                rooms_count=4,
                bedrooms_count=2,
                zip_code=f"0100{index}-000",
                street="Rua das Flores" if index == 1 else f"Rua UX {index}",
                number=str(100 + index * 23),
                complement=None,
                neighborhood=neighborhood,
                city="Sao Paulo",
                state="SP",
                reference_point="Dados exclusivamente sinteticos.",
                total_residents=residents,
                total_adults=max(1, residents - 2),
                total_children=min(2, residents - 1),
                total_elderly=0,
                total_babies=0,
                has_pregnant_member=False,
                has_disabled_member=False,
                has_chronic_illness_member=index == 2,
                has_unemployed_member=index <= 3,
                needs_extra_support=index == 2,
                attends_church=False,
                church_name=None,
                community_relationship="participativa",
                responsible_education_level="ensino medio",
                has_internet_access=index != 2,
                has_mobile_phone=True,
                has_computer=False,
                social_notes="Registro sintetico para validar a jornada social.",
                internal_notes="Nao corresponde a uma familia real.",
                created_by_user_id=users["social"].id,
                updated_by_user_id=users["social"].id,
            )
            db.add(family)
            db.flush()
            db.add(
                Person(
                    family_id=family.id,
                    full_name=responsible,
                    birth_date=date(1982 + index, index, min(10 + index, 28)),
                    kinship="responsavel",
                    gender=None,
                    phone=f"(11) 90000-00{index:02d}",
                    education_level="ensino medio",
                    is_currently_studying=False,
                    is_currently_working=index == 4,
                    occupation="Trabalho informal" if index != 4 else "Atendente",
                    individual_income=income,
                    attends_church=False,
                    has_disability=False,
                    has_chronic_illness=index == 2,
                    is_pregnant=False,
                    is_nursing_mother=False,
                    notes="Pessoa sintetica.",
                    is_family_responsible=True,
                )
            )
            db.add(
                FamilyContact(
                    family_id=family.id,
                    contact_name=responsible,
                    phone=f"(11) 90000-00{index:02d}",
                    contact_type="celular",
                    is_whatsapp=True,
                    notes="Contato sintetico.",
                )
            )
            families.append(family)

        for family, decision, score in (
            (families[0], "apta_recorrente", 82),
            (families[1], "apta_emergencial", 67),
        ):
            db.add(
                SocialAssessment(
                    family_id=family.id,
                    assessment_date=today - timedelta(days=170),
                    monthly_income_total_at_time=family.monthly_income_total,
                    income_per_capita_at_time=family.income_per_capita,
                    vulnerability_score=score,
                    system_suggestion=decision,
                    final_decision=decision,
                    decision_reason="Decisao coerente com o calculo sintetico.",
                    approved_by_user_id=users["social"].id,
                    next_revaluation_date=family.next_revaluation_date,
                    technical_notes="Avaliacao sintetica para testar reavaliacao de aptidao.",
                )
            )

        basic_basket = BasketType(
            name="Cesta Basica UX",
            is_active=True,
            notes="Composicao sintetica para homologacao local.",
        )
        hygiene_basket = BasketType(
            name="Cesta Essencial UX",
            is_active=True,
            notes="Alimentos e higiene em uma composicao sintetica.",
        )
        db.add_all([basic_basket, hygiene_basket])
        db.flush()
        db.add_all(
            [
                BasketTypeItem(basket_type_id=basic_basket.id, item_id=items["rice"].id, required_quantity=1),
                BasketTypeItem(basket_type_id=basic_basket.id, item_id=items["beans"].id, required_quantity=2),
                BasketTypeItem(basket_type_id=basic_basket.id, item_id=items["oil"].id, required_quantity=1),
                BasketTypeItem(basket_type_id=hygiene_basket.id, item_id=items["rice"].id, required_quantity=1),
                BasketTypeItem(basket_type_id=hygiene_basket.id, item_id=items["soap"].id, required_quantity=3),
                BasketTypeItem(basket_type_id=hygiene_basket.id, item_id=items["detergent"].id, required_quantity=2),
            ]
        )

        completed_schedule = DeliverySchedule(
            family_id=families[0].id,
            basket_type_id=basic_basket.id,
            scheduled_date=today - timedelta(days=2),
            status="retirado",
            notes="Retirada sintetica concluida.",
            created_by_user_id=users["admin"].id,
        )
        scheduled_today = DeliverySchedule(
            family_id=families[1].id,
            basket_type_id=hygiene_basket.id,
            scheduled_date=today,
            status="agendado",
            notes="Agendamento sintetico para teste UX.",
            created_by_user_id=users["admin"].id,
        )
        rescheduled_tomorrow = DeliverySchedule(
            family_id=families[0].id,
            basket_type_id=basic_basket.id,
            scheduled_date=today + timedelta(days=1),
            status="reagendado",
            notes="Reagendamento sintetico.",
            created_by_user_id=users["admin"].id,
        )
        db.add_all([completed_schedule, scheduled_today, rescheduled_tomorrow])
        db.flush()

        completed_delivery = Delivery(
            delivery_schedule_id=completed_schedule.id,
            family_id=families[0].id,
            basket_type_id=basic_basket.id,
            delivery_date=now - timedelta(days=2),
            delivered_by_user_id=users["operator"].id,
            status="concluida",
            notes="Entrega sintetica concluida.",
        )
        db.add(completed_delivery)
        db.flush()
        db.add_all(
            [
                StockMovement(
                    batch_id=batches["rice"].id,
                    item_id=items["rice"].id,
                    delivery_id=completed_delivery.id,
                    movement_type="saida_entrega",
                    quantity=1,
                    notes="Baixa sintetica da entrega UX.",
                    created_by_user_id=users["operator"].id,
                ),
                StockMovement(
                    batch_id=batches["beans"].id,
                    item_id=items["beans"].id,
                    delivery_id=completed_delivery.id,
                    movement_type="saida_entrega",
                    quantity=2,
                    notes="Baixa sintetica da entrega UX.",
                    created_by_user_id=users["operator"].id,
                ),
            ]
        )

        db.add_all(
            [
                AuditLog(
                    event_type="sandbox.seed_completed",
                    entity_type="sandbox",
                    entity_id="ux-local",
                    actor_user_id=users["admin"].id,
                    actor_email=users["admin"].email,
                    request_id="ux-seed-0001",
                    ip_address="127.0.0.1",
                    details={"synthetic_data": True, "scope": "local_ux"},
                    created_at=now - timedelta(days=2),
                ),
                AuditLog(
                    event_type="family.assessment_created",
                    entity_type="family",
                    entity_id=str(families[0].id),
                    actor_user_id=users["social"].id,
                    actor_email=users["social"].email,
                    request_id="ux-seed-0002",
                    ip_address="127.0.0.1",
                    details={"synthetic_data": True, "decision": "apta_recorrente"},
                    created_at=now - timedelta(days=1),
                ),
                AuditLog(
                    event_type="delivery.completed",
                    entity_type="delivery",
                    entity_id=str(completed_delivery.id),
                    actor_user_id=users["operator"].id,
                    actor_email=users["operator"].email,
                    request_id="ux-seed-0003",
                    ip_address="127.0.0.1",
                    details={"synthetic_data": True},
                    created_at=now - timedelta(hours=8),
                ),
            ]
        )

        db.commit()


def main() -> None:
    args = parse_args()
    database_path = args.database.expanduser().resolve()
    runtime_dir = database_path.parent
    access = load_or_create_access(runtime_dir)
    configure_isolated_environment(access, args.frontend_origin)

    import uvicorn
    from sqlalchemy import create_engine, event, text
    from sqlalchemy.orm import sessionmaker

    from app.db.base import Base
    from app.db.session import get_db
    import app.main as main_module

    engine = create_engine(
        f"sqlite+pysqlite:///{database_path.as_posix()}",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    sandbox_session = sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )

    def get_sandbox_db():
        db = sandbox_session()
        try:
            yield db
        finally:
            db.close()

    def test_sandbox_db_connection() -> bool:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True

    main_module.app.dependency_overrides[get_db] = get_sandbox_db
    main_module.test_db_connection = test_sandbox_db_connection
    seed_synthetic_data(sandbox_session, access)

    print("Sandbox UX local iniciado com dados exclusivamente sinteticos.", flush=True)
    print(f"Banco isolado: {database_path}", flush=True)
    print(f"Login: {access['login_name']}", flush=True)
    print(f"Senha local: {access['password']}", flush=True)

    uvicorn.run(
        main_module.app,
        host=args.host,
        port=args.port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
