"""Dataset provenance registry. Every external dataset is registered before its rows are stored."""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.models import DatasetMetadata, DatasetStatus


def register_dataset(
    db: Session,
    *,
    dataset_name: str,
    source: str,
    source_url: str | None = None,
    department: str | None = None,
    version: str = "1",
    data_date: date | None = None,
    update_frequency: str | None = None,
    license: str | None = None,
    is_synthetic: bool = False,
    notes: str | None = None,
) -> DatasetMetadata:
    """Register a new version; previous versions of the same name are marked SUPERSEDED."""
    for old in db.query(DatasetMetadata).filter_by(dataset_name=dataset_name, status=DatasetStatus.ACTIVE):
        old.status = DatasetStatus.SUPERSEDED
    meta = DatasetMetadata(
        dataset_name=dataset_name,
        source=source,
        source_url=source_url,
        department=department,
        version=version,
        data_date=data_date,
        retrieved_at=datetime.now(timezone.utc),
        update_frequency=update_frequency,
        license=license,
        is_synthetic=is_synthetic,
        notes=notes,
    )
    db.add(meta)
    db.flush()
    return meta
