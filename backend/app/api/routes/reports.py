import csv
import io
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_any_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.report import ReportKey, ReportsOverviewResponse
from app.services.audit_log_service import record_audit_log
from app.services.auth_service import get_user_roles
from app.services.report_service import (
    ensure_report_access,
    export_report_rows,
    get_reports_overview,
    resolve_report_period,
)
from app.services.stock_availability_policy import operational_today


router = APIRouter(
    tags=["Relatórios"],
    dependencies=[Depends(require_any_role("admin", "lider_social", "operador"))],
)


def _csv_safe(value: object) -> object:
    """Evita que conteúdo textual do banco seja interpretado como fórmula."""

    if isinstance(value, str) and value.startswith(("=", "+", "-", "@")):
        return f"'{value}"
    return value


@router.get("/reports/overview", response_model=ReportsOverviewResponse)
def get_reports_overview_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    resolved_start, resolved_end = resolve_report_period(
        start_date=start_date,
        end_date=end_date,
        today=operational_today(),
    )
    roles = get_user_roles(db, current_user.id)
    return get_reports_overview(
        db,
        start_date=resolved_start,
        end_date=resolved_end,
        roles=roles,
    )


@router.get("/reports/{report_key}/export")
def export_report_endpoint(
    report_key: ReportKey,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    resolved_start, resolved_end = resolve_report_period(
        start_date=start_date,
        end_date=end_date,
        today=operational_today(),
    )
    roles = get_user_roles(db, current_user.id)
    ensure_report_access(report_key, roles)
    headers, rows = export_report_rows(
        db,
        report_key=report_key,
        start_date=resolved_start,
        end_date=resolved_end,
    )

    buffer = io.StringIO()
    buffer.write("\ufeff")
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(headers)
    for row in rows:
        writer.writerow([_csv_safe(value) for value in row])

    record_audit_log(
        db,
        event_type="report.exported",
        actor_user=current_user,
        entity_type="report",
        entity_id=report_key,
        details={
            "report_key": report_key,
            "start_date": resolved_start.isoformat(),
            "end_date": resolved_end.isoformat(),
            "format": "csv",
            "row_count": len(rows),
        },
    )
    db.commit()

    filename = f"{report_key}-{resolved_start.isoformat()}-{resolved_end.isoformat()}.csv"
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
