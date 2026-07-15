from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import and_, case, or_
from sqlalchemy.sql.elements import ColumnElement

from app.models.item import Item
from app.models.stock_batch import StockBatch


OPERATIONAL_TIMEZONE_NAME = "America/Sao_Paulo"
OPERATIONAL_TIMEZONE = ZoneInfo(OPERATIONAL_TIMEZONE_NAME)


def operational_today(at: datetime | None = None) -> date:
    """Retorna a data civil usada nas regras operacionais de estoque."""
    instant = at or datetime.now(timezone.utc)
    if instant.tzinfo is None:
        raise ValueError("O instante informado deve possuir fuso horario.")
    return instant.astimezone(OPERATIONAL_TIMEZONE).date()


def validate_stock_batch_dates(
    *,
    tracks_expiration: bool,
    entry_date: date,
    expiration_date: date | None,
    operational_date: date | None = None,
) -> None:
    """Valida a coerencia entre controle de validade e recebimento do lote."""
    reference_date = operational_date or operational_today()

    if entry_date > reference_date:
        raise ValueError("A data de recebimento nao pode estar no futuro.")

    if tracks_expiration and expiration_date is None:
        raise ValueError("Este item exige data de validade.")

    if expiration_date is not None and expiration_date < entry_date:
        raise ValueError(
            "A data de validade nao pode ser anterior a data de recebimento."
        )


def usable_stock_batch_condition(
    *,
    operational_date: date | None = None,
) -> ColumnElement[bool]:
    """
    Constroi a politica SQL unica de saldo utilizavel.

    Lotes sem validade somente sao utilizaveis quando o item explicitamente nao
    controla validade. No dia da validade, o lote continua utilizavel ate o fim
    da data operacional em America/Sao_Paulo.
    """
    reference_date = operational_date or operational_today()

    expiration_is_usable = or_(
        StockBatch.expiration_date >= reference_date,
        and_(
            StockBatch.expiration_date.is_(None),
            Item.tracks_expiration.is_(False),
        ),
    )

    return and_(
        Item.is_active.is_(True),
        StockBatch.status == "disponivel",
        StockBatch.current_quantity > 0,
        StockBatch.entry_date <= reference_date,
        expiration_is_usable,
    )


def is_stock_batch_usable(
    *,
    batch: StockBatch,
    item: Item,
    operational_date: date | None = None,
) -> bool:
    """Aplica em uma instancia a mesma politica usada nas consultas SQL."""
    reference_date = operational_date or operational_today()
    expiration_is_usable = (
        batch.expiration_date is not None
        and batch.expiration_date >= reference_date
    ) or (
        batch.expiration_date is None
        and not item.tracks_expiration
    )

    return bool(
        item.is_active
        and batch.status == "disponivel"
        and batch.current_quantity > 0
        and batch.entry_date <= reference_date
        and expiration_is_usable
    )


def is_expiration_loss_applicable(
    *,
    batch: StockBatch,
    item: Item,
    operational_date: date | None = None,
) -> bool:
    """Indica quando uma perda de validade representa uma causa real do lote."""
    reference_date = operational_date or operational_today()
    is_expired = (
        batch.expiration_date is not None
        and batch.expiration_date < reference_date
    )
    is_missing_required_expiration = (
        batch.expiration_date is None
        and item.tracks_expiration
    )
    return is_expired or is_missing_required_expiration


def usable_stock_batch_join_condition(
    item_id_column,
    *,
    operational_date: date | None = None,
) -> ColumnElement[bool]:
    """Liga um item apenas aos lotes que integram seu saldo utilizavel."""
    return and_(
        StockBatch.item_id == item_id_column,
        usable_stock_batch_condition(operational_date=operational_date),
    )


def stock_batch_fefo_ordering() -> tuple:
    """Ordenacao FEFO deterministica; lotes sem validade ficam por ultimo."""
    return (
        StockBatch.item_id.asc(),
        case((StockBatch.expiration_date.is_(None), 1), else_=0),
        StockBatch.expiration_date.asc(),
        StockBatch.entry_date.asc(),
        StockBatch.id.asc(),
    )
