from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Iterable

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models.basket_type import BasketType
from app.models.benefit import Benefit
from app.models.delivery import Delivery
from app.models.family import Family
from app.models.item import Item
from app.models.stock_batch import StockBatch
from app.models.stock_movement import StockMovement
from app.schemas.report import ReportKey
from app.services.stock_summary_service import list_stock_alerts


REPORT_DEFINITIONS = (
    {
        "key": "attendances",
        "title": "Atendimentos por período",
        "description": "Famílias atendidas e recorrência de entregas no período.",
        "roles": {"admin", "lider_social"},
        "uses_period": True,
    },
    {
        "key": "deliveries",
        "title": "Cestas entregues",
        "description": "Entregas concluídas por data, família e tipo de cesta.",
        "roles": {"admin", "operador"},
        "uses_period": True,
    },
    {
        "key": "stock_movements",
        "title": "Estoque movimentado",
        "description": "Entradas, saídas, perdas e ajustes registrados no período.",
        "roles": {"admin", "operador"},
        "uses_period": True,
    },
    {
        "key": "benefits",
        "title": "Benefícios concedidos",
        "description": "Benefícios iniciados no período, com valor e situação.",
        "roles": {"admin", "lider_social"},
        "uses_period": True,
    },
    {
        "key": "families",
        "title": "Famílias cadastradas",
        "description": "Cadastros realizados no período, por situação e região.",
        "roles": {"admin", "lider_social"},
        "uses_period": True,
    },
    {
        "key": "stock_alerts",
        "title": "Alertas de estoque",
        "description": "Posição atual dos itens abaixo do estoque mínimo.",
        "roles": {"admin", "operador"},
        "uses_period": False,
    },
)

REPORT_ACCESS = {
    definition["key"]: definition["roles"] for definition in REPORT_DEFINITIONS
}


def resolve_report_period(
    *,
    start_date: date | None,
    end_date: date | None,
    today: date,
) -> tuple[date, date]:
    """Normaliza e limita o período para consultas e exportações previsíveis."""

    resolved_end = end_date or today
    resolved_start = start_date or resolved_end.replace(day=1)

    if resolved_start > resolved_end:
        raise HTTPException(
            status_code=422,
            detail="A data inicial não pode ser posterior à data final.",
        )
    if (resolved_end - resolved_start).days > 366:
        raise HTTPException(
            status_code=422,
            detail="O período máximo para relatórios é de 367 dias.",
        )

    return resolved_start, resolved_end


def _datetime_bounds(start_date: date, end_date: date) -> tuple[datetime, datetime]:
    return (
        datetime.combine(start_date, time.min),
        datetime.combine(end_date + timedelta(days=1), time.min),
    )


def _normalized_roles(roles: Iterable[str]) -> set[str]:
    return {role.strip().lower() for role in roles if role and role.strip()}


def list_available_reports(roles: Iterable[str]) -> list[dict]:
    normalized_roles = _normalized_roles(roles)
    return [
        {
            "key": definition["key"],
            "title": definition["title"],
            "description": definition["description"],
            "format": "csv",
            "uses_period": definition["uses_period"],
        }
        for definition in REPORT_DEFINITIONS
        if normalized_roles.intersection(definition["roles"])
    ]


def ensure_report_access(report_key: ReportKey, roles: Iterable[str]) -> None:
    allowed_roles = REPORT_ACCESS[report_key]
    if not _normalized_roles(roles).intersection(allowed_roles):
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para gerar este relatório.",
        )


def get_reports_overview(
    db: Session,
    *,
    start_date: date,
    end_date: date,
    roles: Iterable[str],
) -> dict:
    start_datetime, exclusive_end = _datetime_bounds(start_date, end_date)
    delivery_period = and_(
        Delivery.delivery_date >= start_datetime,
        Delivery.delivery_date < exclusive_end,
        Delivery.status == "concluida",
    )

    families_served = db.scalar(
        select(func.count(func.distinct(Delivery.family_id))).where(delivery_period)
    )
    baskets_delivered = db.scalar(
        select(func.count(Delivery.id)).where(delivery_period)
    )
    items_distributed = db.scalar(
        select(func.coalesce(func.sum(StockMovement.quantity), 0))
        .join(Delivery, Delivery.id == StockMovement.delivery_id)
        .where(
            delivery_period,
            StockMovement.movement_type == "saida_entrega",
        )
    )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "generated_at": datetime.now(),
        "kpis": {
            "families_served": int(families_served or 0),
            "baskets_delivered": int(baskets_delivered or 0),
            "items_distributed": int(items_distributed or 0),
        },
        "available_reports": list_available_reports(roles),
    }


def _export_attendances(
    db: Session, start_date: date, end_date: date
) -> tuple[list[str], list[list[object]]]:
    start_datetime, exclusive_end = _datetime_bounds(start_date, end_date)
    rows = db.execute(
        select(
            Family.internal_code,
            func.count(Delivery.id).label("deliveries_count"),
            func.min(Delivery.delivery_date).label("first_delivery"),
            func.max(Delivery.delivery_date).label("last_delivery"),
        )
        .join(Delivery, Delivery.family_id == Family.id)
        .where(
            Delivery.delivery_date >= start_datetime,
            Delivery.delivery_date < exclusive_end,
            Delivery.status == "concluida",
        )
        .group_by(Family.id, Family.internal_code)
        .order_by(Family.internal_code.asc())
    ).all()
    return (
        ["codigo_familia", "atendimentos", "primeiro_atendimento", "ultimo_atendimento"],
        [
            [
                row.internal_code,
                int(row.deliveries_count or 0),
                row.first_delivery.isoformat(),
                row.last_delivery.isoformat(),
            ]
            for row in rows
        ],
    )


def _export_deliveries(
    db: Session, start_date: date, end_date: date
) -> tuple[list[str], list[list[object]]]:
    start_datetime, exclusive_end = _datetime_bounds(start_date, end_date)
    rows = db.execute(
        select(
            Delivery.id,
            Delivery.delivery_date,
            Family.internal_code,
            BasketType.name.label("basket_type_name"),
            Delivery.status,
        )
        .join(Family, Family.id == Delivery.family_id)
        .join(BasketType, BasketType.id == Delivery.basket_type_id)
        .where(
            Delivery.delivery_date >= start_datetime,
            Delivery.delivery_date < exclusive_end,
            Delivery.status == "concluida",
        )
        .order_by(Delivery.delivery_date.desc(), Delivery.id.desc())
    ).all()
    return (
        ["entrega_id", "data", "codigo_familia", "tipo_cesta", "status"],
        [
            [
                row.id,
                row.delivery_date.isoformat(),
                row.internal_code,
                row.basket_type_name,
                row.status,
            ]
            for row in rows
        ],
    )


def _export_stock_movements(
    db: Session, start_date: date, end_date: date
) -> tuple[list[str], list[list[object]]]:
    start_datetime, exclusive_end = _datetime_bounds(start_date, end_date)
    rows = db.execute(
        select(
            StockMovement.id,
            StockMovement.created_at,
            Item.name.label("item_name"),
            StockBatch.batch_code,
            StockMovement.movement_type,
            StockMovement.quantity,
            Item.unit_measure,
            StockBatch.storage_location,
        )
        .join(Item, Item.id == StockMovement.item_id)
        .join(StockBatch, StockBatch.id == StockMovement.batch_id)
        .where(
            StockMovement.created_at >= start_datetime,
            StockMovement.created_at < exclusive_end,
        )
        .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
    ).all()
    return (
        ["movimentacao_id", "data", "produto", "lote", "tipo", "quantidade", "unidade", "localizacao"],
        [
            [
                row.id,
                row.created_at.isoformat(),
                row.item_name,
                row.batch_code or "",
                row.movement_type,
                int(row.quantity),
                row.unit_measure,
                row.storage_location or "",
            ]
            for row in rows
        ],
    )


def _export_benefits(
    db: Session, start_date: date, end_date: date
) -> tuple[list[str], list[list[object]]]:
    start_datetime, exclusive_end = _datetime_bounds(start_date, end_date)
    rows = db.execute(
        select(Benefit, Family.internal_code)
        .join(Family, Family.id == Benefit.family_id)
        .where(
            or_(
                Benefit.start_date.between(start_date, end_date),
                and_(
                    Benefit.start_date.is_(None),
                    Benefit.created_at >= start_datetime,
                    Benefit.created_at < exclusive_end,
                ),
            )
        )
        .order_by(Benefit.start_date.desc(), Benefit.id.desc())
    ).all()
    return (
        ["beneficio_id", "codigo_familia", "tipo", "valor_mensal", "inicio", "fim", "status"],
        [
            [
                benefit.id,
                internal_code,
                benefit.benefit_type,
                f"{Decimal(benefit.monthly_amount or 0):.2f}",
                benefit.start_date.isoformat() if benefit.start_date else "",
                benefit.end_date.isoformat() if benefit.end_date else "",
                "ativo" if benefit.is_active else "inativo",
            ]
            for benefit, internal_code in rows
        ],
    )


def _export_families(
    db: Session, start_date: date, end_date: date
) -> tuple[list[str], list[list[object]]]:
    rows = db.scalars(
        select(Family)
        .where(Family.registration_date.between(start_date, end_date))
        .order_by(Family.registration_date.desc(), Family.id.desc())
    ).all()
    return (
        ["codigo_familia", "cadastro", "status", "bairro", "cidade", "uf", "moradores"],
        [
            [
                family.internal_code,
                family.registration_date.isoformat(),
                family.status,
                family.neighborhood,
                family.city,
                family.state,
                family.total_residents,
            ]
            for family in rows
        ],
    )


def _export_stock_alerts(db: Session) -> tuple[list[str], list[list[object]]]:
    alerts = list_stock_alerts(db)
    return (
        ["produto_id", "produto", "categoria", "quantidade_atual", "estoque_minimo"],
        [
            [
                alert["item_id"],
                alert["item_name"],
                alert["category_name"],
                alert["total_quantity"],
                alert["minimum_stock_alert"],
            ]
            for alert in alerts
        ],
    )


def export_report_rows(
    db: Session,
    *,
    report_key: ReportKey,
    start_date: date,
    end_date: date,
) -> tuple[list[str], list[list[object]]]:
    exporters = {
        "attendances": lambda: _export_attendances(db, start_date, end_date),
        "deliveries": lambda: _export_deliveries(db, start_date, end_date),
        "stock_movements": lambda: _export_stock_movements(db, start_date, end_date),
        "benefits": lambda: _export_benefits(db, start_date, end_date),
        "families": lambda: _export_families(db, start_date, end_date),
        "stock_alerts": lambda: _export_stock_alerts(db),
    }
    return exporters[report_key]()
