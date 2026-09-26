from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import User, get_state, require_role
from app.db.session import get_db
from app.ingestion import loaders
from app.models import DatasetMetadata, GeographicEntity
from app.services import bigquery_service as bq
from app.services.warehouse_service import sync

router = APIRouter(prefix="/datasets", tags=["government data"])
LOADERS = {"projects": loaders.load_projects, "investment": loaders.load_investment}


@router.get("")
def list_datasets(db: Session = Depends(get_db), user: User = Depends(require_role("analyst", "policymaker"))):
    return [{"id": d.id, "dataset_name": d.dataset_name, "source": d.source, "source_url": d.source_url, "department": d.department,
             "version": d.version, "data_date": d.data_date, "retrieved_at": d.retrieved_at, "update_frequency": d.update_frequency,
             "license": d.license, "is_synthetic": d.is_synthetic, "row_count": d.row_count, "coverage": d.coverage,
             "status": d.status.value, "notes": d.notes}
            for d in db.query(DatasetMetadata).order_by(DatasetMetadata.retrieved_at.desc())]


@router.post("/import")
async def import_dataset(kind: str = Form(..., description="infrastructure | projects | investment"), file: UploadFile = File(...),
                         db: Session = Depends(get_db), user: User = Depends(require_role("admin", "analyst"))):
    if kind not in LOADERS:
        raise HTTPException(400, f"kind must be one of {list(LOADERS)}")
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        tmp.write(await file.read())
        path = Path(tmp.name)
    try:
        n = LOADERS[kind](db, path)
        db.commit()
    except RuntimeError as e:  # validation rejected rows: nothing is stored
        db.rollback()
        raise HTTPException(422, str(e))
    finally:
        path.unlink(missing_ok=True)
    return {"kind": kind, "rows_loaded": n}


@router.get("/warehouse")
def warehouse_status(user: User = Depends(require_role("analyst", "policymaker"))):
    """Whether the BigQuery national layer is actually reachable, and what it holds.

    This calls BigQuery rather than inspecting configuration, so the dashboard can never claim a
    capability that would fail the moment someone used it.
    """
    st = bq.status()
    return {
        "enabled": st["live"],
        "configured": bq.configured(),
        "dataset": st["dataset"],
        "reason": st["reason"],
        "row_counts": st["tables"],
        "tables": bq.TABLES,
        "purpose": "Postgres serves the operational loop; BigQuery holds the national analytical "
                   "tables that a ministry would query across every state at once.",
    }


@router.post("/warehouse/sync")
def warehouse_sync(db: Session = Depends(get_db), state: GeographicEntity = Depends(get_state),
                   user: User = Depends(require_role("admin", "analyst"))):
    """Rebuild the national tables and push them to BigQuery."""
    return sync(db, state.id)


@router.get("/warehouse/national")
def warehouse_national(user: User = Depends(require_role("policymaker", "analyst"))):
    """Top priorities per state, computed in BigQuery across all 36 states in one query."""
    st = bq.status()
    if not st["live"]:
        raise HTTPException(503, st["reason"])
    return bq.national_summary().to_dict(orient="records")
