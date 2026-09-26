"""Build the two national tables and push them to BigQuery.

The frames are built the same way whether or not BigQuery is configured, so `build_*` is
testable on its own and the sync is just the last step.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd
from sqlalchemy.orm import Session

from app.analytics.aggregation import government_frame
from app.models import Category, Demographics, GeographicEntity, GeoLevel, InfrastructureIndex
from app.services import bigquery_service as bq
from app.services.recommendation_service import dashboard_frame

INDEX_COLUMNS = [c.name for c in InfrastructureIndex.__table__.columns if c.name.endswith("_index")]


def build_district_profile(db: Session) -> pd.DataFrame:
    """Every district in the country: census demographics plus all 16 indices."""
    rows = (
        db.query(GeographicEntity, GeographicEntity.parent_id, Demographics, InfrastructureIndex)
        .join(Demographics, Demographics.geo_id == GeographicEntity.id)
        .outerjoin(InfrastructureIndex, InfrastructureIndex.geo_id == GeographicEntity.id)
        .filter(GeographicEntity.level == GeoLevel.DISTRICT)
        .all()
    )
    states = {s.id: s.name for s in db.query(GeographicEntity).filter_by(level=GeoLevel.STATE)}
    out = []
    for geo, parent_id, demo, infra in rows:
        r = {
            "state": states.get(parent_id), "district": geo.name, "district_code": geo.code,
            "latitude": geo.centroid_lat, "longitude": geo.centroid_lng,
            "population": demo.population, "literacy_rate": demo.literacy_rate,
            "urban_population_pct": demo.urban_population_pct,
            "mobile_penetration_pct": demo.mobile_penetration_pct,
        }
        for col in INDEX_COLUMNS:
            r[col] = getattr(infra, col, None) if infra else None
        out.append(r)
    return pd.DataFrame(out)


def build_demand_snapshot(db: Session, state_id: int) -> pd.DataFrame:
    """Citizen demand joined to infrastructure, budget and the computed priority, per category."""
    df = dashboard_frame(db, state_id)
    if df.empty:
        return pd.DataFrame()
    state = db.get(GeographicEntity, state_id)
    index_source = {c.code: c.index_source for c in db.query(Category)}
    out = pd.DataFrame({
        "snapshot_date": datetime.now(timezone.utc).date(),
        "state": state.name,
        "district": df["district"],
        "category_code": df["category_code"],
        "category": df["category"],
        "population": df["population"].astype("int64"),
        "unique_citizens": df["unique_citizens"].astype("int64"),
        "requests": df["request_count"].astype("int64"),
        "per_100k": df["per_100k"].round(2),
        "adjusted_per_100k": df["adjusted_per_100k"].round(2),
        "avg_urgency": df["avg_urgency"].round(2),
        "growth_30d_pct": df["growth_pct"].round(1),
        "infrastructure_index": df["infra_index"],
        "infrastructure_gap": df["infra_gap"].round(1),
        "index_source": df["category_code"].map(index_source),
        "allocated_inr_cr": (df["allocated_inr"] / 1e7).round(2),
        "priority_score": df["priority_score"],
        "alignment_quadrant": df["alignment_quadrant"],
    })
    return out


def sync(db: Session, state_id: int) -> dict:
    """Push both tables. Returns what happened, including when BigQuery is not configured."""
    profile = build_district_profile(db)
    snapshot = build_demand_snapshot(db, state_id)
    result = {
        "bigquery_configured": bq.configured(),
        "district_profile_rows": len(profile),
        "demand_snapshot_rows": len(snapshot),
    }
    if not bq.configured():
        result["note"] = ("BigQuery is not configured, so the frames were built but not uploaded. "
                          "Set GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS to enable it.")
        return result
    result["dataset"] = bq.ensure_dataset()
    bq.upload("district_profile", profile)
    if not snapshot.empty:
        bq.upload("demand_snapshot", snapshot)
    return result
