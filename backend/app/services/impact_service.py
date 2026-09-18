"""Impact measurement: freeze a baseline when a recommendation is accepted, compare later."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import GeographicEntity, ImpactBaseline, Recommendation
from app.services.recommendation_service import dashboard_frame


def snapshot_for(db: Session, geo_id: int, category_code: str) -> dict:
    geo = db.get(GeographicEntity, geo_id)
    df = dashboard_frame(db, geo.parent_id)
    row = df[(df["geo_id"] == geo_id) & (df["category_code"] == category_code)]
    if row.empty:
        return {}
    r = row.iloc[0]
    return {
        "unique_citizens": int(r["unique_citizens"]), "requests": int(r["request_count"]),
        "per_1000": round(float(r["per_1000"]), 2), "avg_urgency": round(float(r["avg_urgency"]), 1),
        "infrastructure_index": round(float(r["infra_index"]), 1), "clusters": int(r["cluster_count"]),
        "last_30d": int(r["last_30d"]), "priority_score": float(r["priority_score"]),
    }


def create_baseline(db: Session, rec: Recommendation) -> ImpactBaseline:
    existing = db.query(ImpactBaseline).filter_by(recommendation_id=rec.id).first()
    if existing:
        return existing
    b = ImpactBaseline(recommendation_id=rec.id, geo_id=rec.geo_id, category_code=rec.category_code,
                       snapshot=snapshot_for(db, rec.geo_id, rec.category_code), snapshot_at=datetime.now(timezone.utc))
    db.add(b)
    db.flush()
    return b


def compare(db: Session, rec: Recommendation) -> dict | None:
    b = db.query(ImpactBaseline).filter_by(recommendation_id=rec.id).first()
    if not b:
        return None
    now = snapshot_for(db, rec.geo_id, rec.category_code)
    delta = {k: round(now[k] - b.snapshot[k], 2) for k in now if k in b.snapshot and isinstance(now[k], (int, float))}
    return {"baseline": b.snapshot, "baseline_at": b.snapshot_at, "current": now, "delta": delta,
            "caution": "Changes show evidence of impact, not proof of causation; check season, migration and channel health."}
