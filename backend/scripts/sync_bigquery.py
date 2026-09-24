"""Push the national tables to BigQuery.
Run: python3.12 -m scripts.sync_bigquery
"""
from app.core.config import settings
from app.db.session import SessionLocal
from app.models import GeographicEntity, GeoLevel
from app.services.warehouse_service import sync

with SessionLocal() as db:
    state = db.query(GeographicEntity).filter_by(level=GeoLevel.STATE, name=settings.default_state).one()
    for k, v in sync(db, state.id).items():
        print(f"  {k}: {v}")
