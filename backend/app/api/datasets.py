from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import User, require_role
from app.db.session import get_db
from app.ingestion import loaders
from app.models import DatasetMetadata

router = APIRouter(prefix="/datasets", tags=["government data"])
LOADERS = {"infrastructure": loaders.load_infrastructure, "projects": loaders.load_projects, "investment": loaders.load_investment}


@router.get("")
def list_datasets(db: Session = Depends(get_db), user: User = Depends(require_role("analyst", "policymaker"))):
    return [{"id": d.id, "dataset_name": d.dataset_name, "source": d.source, "source_url": d.source_url, "department": d.department,
             "version": d.version, "data_date": d.data_date, "retrieved_at": d.retrieved_at, "update_frequency": d.update_frequency,
             "license": d.license, "is_synthetic": d.is_synthetic, "row_count": d.row_count, "status": d.status.value, "notes": d.notes}
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
