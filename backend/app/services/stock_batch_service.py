from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models.item import Item
from app.models.stock_batch import StockBatch
from app.models.user import User
from app.schemas.stock_batch import StockBatchCreate, StockBatchMetadataUpdate
from app.services.audit_log_service import record_audit_log
from app.services.stock_availability_policy import validate_stock_batch_dates


RESTRICTED_BATCH_STATUSES = {"quarentena", "bloqueado"}


def _normalize_batch_code(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().upper()
    return normalized or None


def _generated_batch_code(*, entry_date, batch_id: int | None = None) -> str:
    suffix = f"{batch_id:06d}" if batch_id is not None else uuid4().hex[:8].upper()
    return f"LT-{entry_date:%Y%m%d}-{suffix}"


def _validate_operational_metadata(
    *,
    status: str,
    quarantine_reason: str | None,
) -> str | None:
    normalized_reason = (
        quarantine_reason.strip() if quarantine_reason is not None else None
    )
    normalized_reason = normalized_reason or None

    if status in RESTRICTED_BATCH_STATUSES and normalized_reason is None:
        raise HTTPException(
            status_code=400,
            detail="Lote em quarentena ou bloqueado exige um motivo.",
        )

    if status == "disponivel":
        return None
    return normalized_reason


def _ensure_unique_batch_code(
    db: Session,
    *,
    batch_code: str,
    exclude_batch_id: int | None = None,
) -> None:
    stmt = select(StockBatch.id).where(StockBatch.batch_code == batch_code)
    if exclude_batch_id is not None:
        stmt = stmt.where(StockBatch.id != exclude_batch_id)

    if db.scalar(stmt.limit(1)) is not None:
        raise HTTPException(
            status_code=409,
            detail="Ja existe um lote com este codigo.",
        )


def create_stock_batch(
    db: Session,
    payload: StockBatchCreate,
    current_user: User,
) -> StockBatch:
    item = db.get(Item, payload.item_id)
    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Item nao encontrado.",
        )

    if not item.is_active:
        raise HTTPException(
            status_code=400,
            detail="Itens inativos nao podem receber novos lotes.",
        )

    try:
        validate_stock_batch_dates(
            tracks_expiration=item.tracks_expiration,
            entry_date=payload.entry_date,
            expiration_date=payload.expiration_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    batch_code = _normalize_batch_code(payload.batch_code)
    quarantine_reason = _validate_operational_metadata(
        status=payload.status,
        quarantine_reason=payload.quarantine_reason,
    )
    if batch_code is not None:
        _ensure_unique_batch_code(db, batch_code=batch_code)

    batch = StockBatch(
        item_id=payload.item_id,
        batch_code=batch_code or _generated_batch_code(entry_date=payload.entry_date),
        source_type=payload.source_type,
        status=payload.status,
        entry_quantity=payload.entry_quantity,
        current_quantity=payload.entry_quantity,
        entry_date=payload.entry_date,
        expiration_date=payload.expiration_date,
        storage_location=payload.storage_location,
        quarantine_reason=quarantine_reason,
        estimated_unit_value=payload.estimated_unit_value,
        notes=payload.notes,
        created_by_user_id=current_user.id,
    )

    try:
        db.add(batch)
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Ja existe um lote com este codigo.",
        ) from exc

    record_audit_log(
        db,
        event_type="stock.batch.created",
        actor_user=current_user,
        entity_type="stock_batch",
        entity_id=batch.id,
        details={
            "item_id": batch.item_id,
            "batch_code": batch.batch_code,
            "status": batch.status,
            "storage_location": batch.storage_location,
            "entry_quantity": int(batch.entry_quantity),
            "source_type": batch.source_type,
        },
    )
    db.commit()
    db.refresh(batch)
    return batch


def update_stock_batch_metadata(
    db: Session,
    batch_id: int,
    payload: StockBatchMetadataUpdate,
    current_user: User,
) -> StockBatch:
    batch = db.scalar(
        select(StockBatch)
        .where(StockBatch.id == batch_id)
        .with_for_update()
    )
    if batch is None:
        raise HTTPException(status_code=404, detail="Lote nao encontrado.")

    provided_fields = payload.model_fields_set
    batch_code = batch.batch_code
    if "batch_code" in provided_fields:
        batch_code = _normalize_batch_code(payload.batch_code) or _generated_batch_code(
            entry_date=batch.entry_date,
            batch_id=batch.id,
        )
        _ensure_unique_batch_code(
            db,
            batch_code=batch_code,
            exclude_batch_id=batch.id,
        )

    status = payload.status if "status" in provided_fields else batch.status
    quarantine_reason = (
        payload.quarantine_reason
        if "quarantine_reason" in provided_fields
        else batch.quarantine_reason
    )
    quarantine_reason = _validate_operational_metadata(
        status=status or batch.status,
        quarantine_reason=quarantine_reason,
    )

    previous_state = {
        "batch_code": batch.batch_code,
        "status": batch.status,
        "storage_location": batch.storage_location,
        "quarantine_reason": batch.quarantine_reason,
        "notes": batch.notes,
    }

    batch.batch_code = batch_code
    batch.status = status or batch.status
    batch.quarantine_reason = quarantine_reason
    if "storage_location" in provided_fields:
        batch.storage_location = payload.storage_location
    if "notes" in provided_fields:
        batch.notes = payload.notes

    current_state = {
        "batch_code": batch.batch_code,
        "status": batch.status,
        "storage_location": batch.storage_location,
        "quarantine_reason": batch.quarantine_reason,
        "notes": batch.notes,
    }
    if current_state == previous_state:
        db.commit()
        db.refresh(batch)
        return batch

    try:
        record_audit_log(
            db,
            event_type="stock.batch.metadata_updated",
            actor_user=current_user,
            entity_type="stock_batch",
            entity_id=batch.id,
            details={
                "previous": previous_state,
                "current": current_state,
            },
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Ja existe um lote com este codigo.",
        ) from exc

    db.refresh(batch)
    return batch


def list_stock_batches(
    db: Session,
    *,
    item_id: int | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[StockBatch], int]:
    filters = []
    if item_id is not None:
        filters.append(StockBatch.item_id == item_id)

    total_stmt = select(func.count(StockBatch.id))
    stmt = select(StockBatch).order_by(StockBatch.id.desc())

    if filters:
        total_stmt = total_stmt.where(*filters)
        stmt = stmt.where(*filters)

    total = db.scalar(total_stmt) or 0

    if limit is not None:
        stmt = stmt.offset(offset).limit(limit)

    return list(db.scalars(stmt).all()), total
