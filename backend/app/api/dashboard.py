from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from geoalchemy2.functions import ST_AsGeoJSON, ST_SimplifyPreserveTopology
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.analytics.aggregation import VALID_STATUSES, cluster_list, trend_series
from app.analytics.hotspots import top_hotspots
from app.api.deps import User, get_state, require_role
from app.db.session import get_db
from app.models import Category, CitizenRequest, DatasetMetadata, Demographics, GeographicEntity, GeoLevel, ProcessingStatus
from app.schemas.dashboard import HotspotOut, SummaryOut
from app.services.recommendation_service import dashboard_frame

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_role("analyst", "policymaker"))])


def _hotspot_rows(df) -> list[HotspotOut]:
    return [HotspotOut(
        geo_id=int(r.geo_id), district=r.district, category_code=r.category_code, category=r.category,
        requests=int(r.request_count), unique_citizens=int(r.unique_citizens), per_1000=round(float(r.per_1000), 2),
        adjusted_per_1000=round(float(r.adjusted_per_1000), 2), avg_urgency=round(float(r.avg_urgency), 1),
        growth_pct=round(float(r.growth_pct), 1), population=int(r.population), people_directly_represented=int(r.affected_population),
        infra_index=float(r.infra_index) if r.infra_index == r.infra_index else None, infra_gap=float(r.infra_gap),
        allocated_inr_cr=round(float(r.allocated_inr) / 1e7, 2), alignment_quadrant=r.alignment_quadrant,
        existing_project=r.existing_project_name, existing_project_status=r.existing_project_status,
        hotspot_score=float(r.hotspot_score), priority_score=float(r.priority_score), clusters=int(r.cluster_count),
    ) for r in df.itertuples()]


@router.get("/summary", response_model=SummaryOut)
def summary(db: Session = Depends(get_db), state: GeographicEntity = Depends(get_state)):
    base = db.query(CitizenRequest).join(GeographicEntity, GeographicEntity.id == CitizenRequest.resolved_geo_id).filter(GeographicEntity.parent_id == state.id)
    valid = base.filter(CitizenRequest.processing_status.in_(VALID_STATUSES), CitizenRequest.is_flagged.is_(False))
    total = valid.count()
    uniq = valid.with_entities(func.count(func.distinct(func.coalesce(CitizenRequest.citizen_hash, func.cast(CitizenRequest.id, __import__("sqlalchemy").String))))).scalar() or 0
    pop = db.query(func.sum(Demographics.population)).join(GeographicEntity, GeographicEntity.id == Demographics.geo_id).filter(GeographicEntity.parent_id == state.id).scalar() or 1
    now = datetime.now(timezone.utc)
    last30 = valid.filter(CitizenRequest.submitted_at >= now - timedelta(days=30)).count()
    prev30 = valid.filter(CitizenRequest.submitted_at >= now - timedelta(days=60), CitizenRequest.submitted_at < now - timedelta(days=30)).count()
    langs = dict(valid.with_entities(CitizenRequest.detected_language, func.count()).group_by(CitizenRequest.detected_language).all())
    chans = {k.value: v for k, v in valid.with_entities(CitizenRequest.channel, func.count()).group_by(CitizenRequest.channel).all()}
    cats = valid.with_entities(CitizenRequest.category_code, Category.name, func.count()).join(Category, Category.code == CitizenRequest.category_code).group_by(CitizenRequest.category_code, Category.name).order_by(func.count().desc()).limit(8).all()
    review = db.query(CitizenRequest).filter(CitizenRequest.processing_status == ProcessingStatus.REVIEW_REQUIRED).count()
    ds = [{"name": d.dataset_name, "source": d.source, "data_date": d.data_date, "retrieved_at": d.retrieved_at, "is_synthetic": d.is_synthetic, "status": d.status.value}
          for d in db.query(DatasetMetadata).filter(DatasetMetadata.status == "ACTIVE")]
    return SummaryOut(
        state=state.name, total_requests=total, unique_citizens=uniq, districts_reporting=valid.with_entities(func.count(func.distinct(CitizenRequest.resolved_geo_id))).scalar() or 0,
        languages={k or "unknown": v for k, v in langs.items()}, channels=chans, review_required=review,
        per_1000_population=round(uniq / pop * 1000, 2), growth_30d_pct=round(((last30 - prev30) / prev30 * 100) if prev30 else 0.0, 1),
        top_categories=[{"code": c, "name": n, "count": k} for c, n, k in cats], datasets=ds,
    )


@router.get("/hotspots", response_model=list[HotspotOut])
def hotspots(db: Session = Depends(get_db), state: GeographicEntity = Depends(get_state), category: str | None = None,
             limit: int = Query(20, le=200), min_citizens: int = Query(3, ge=1)):
    df = dashboard_frame(db, state.id)
    if df.empty:
        return []
    return _hotspot_rows(top_hotspots(df, category_code=category, min_citizens=min_citizens, limit=limit))


@router.get("/categories")
def categories(db: Session = Depends(get_db), state: GeographicEntity = Depends(get_state), district: str | None = None):
    q = db.query(CitizenRequest.category_code, Category.name, func.count(), func.avg(CitizenRequest.urgency_score)).join(Category, Category.code == CitizenRequest.category_code) \
        .join(GeographicEntity, GeographicEntity.id == CitizenRequest.resolved_geo_id).filter(GeographicEntity.parent_id == state.id, CitizenRequest.processing_status.in_(VALID_STATUSES), CitizenRequest.is_flagged.is_(False))
    if district:
        q = q.filter(GeographicEntity.name == district)
    return [{"code": c, "name": n, "count": k, "avg_urgency": round(float(u), 1) if u else None} for c, n, k, u in q.group_by(CitizenRequest.category_code, Category.name).order_by(func.count().desc())]


@router.get("/trends")
def trends(db: Session = Depends(get_db), state: GeographicEntity = Depends(get_state), district: str | None = None,
           category: str | None = None, months: int = Query(6, ge=1, le=24)):
    geo = db.query(GeographicEntity).filter_by(level=GeoLevel.DISTRICT, name=district).first() if district else None
    return trend_series(db, state.id, geo_id=geo.id if geo else None, category_code=category, months=months)


@router.get("/clusters")
def clusters(db: Session = Depends(get_db), state: GeographicEntity = Depends(get_state), district: str | None = None,
             category: str | None = None, limit: int = Query(50, le=200)):
    geo = db.query(GeographicEntity).filter_by(level=GeoLevel.DISTRICT, name=district).first() if district else None
    return cluster_list(db, state.id, geo_id=geo.id if geo else None, category_code=category, limit=limit)


@router.get("/alignment")
def alignment(db: Session = Depends(get_db), state: GeographicEntity = Depends(get_state), category: str | None = None):
    df = dashboard_frame(db, state.id)
    if df.empty:
        return []
    if category:
        df = df[df["category_code"] == category]
    cols = ["geo_id", "district", "category_code", "category", "unique_citizens", "adjusted_per_1000", "infra_gap", "allocated_inr",
            "invest_per_capita_inr", "demand_rank", "invest_rank", "misalignment_index", "alignment_quadrant", "priority_score"]
    out = df[cols].copy()
    out["allocated_inr_cr"] = (out.pop("allocated_inr") / 1e7).round(2)
    return json.loads(out.round(3).to_json(orient="records"))


@router.get("/geo")
def geo(db: Session = Depends(get_db), state: GeographicEntity = Depends(get_state), category: str | None = None,
        tolerance: float = Query(0.005, description="simplification tolerance in degrees")):
    """District GeoJSON with joined indicators — the map layer. One feature per district."""
    df = dashboard_frame(db, state.id)
    per_district: dict[int, dict] = {}
    if not df.empty:
        d = df[df["category_code"] == category] if category else df
        g = d.groupby(["geo_id", "district"]).agg(requests=("request_count", "sum"), unique_citizens=("unique_citizens", "sum"),
                                                   population=("population", "first"), avg_urgency=("avg_urgency", "max"),
                                                   infra_index=("infra_index", "mean"), priority_score=("priority_score", "max"),
                                                   hotspot_score=("hotspot_score", "max"), allocated_inr=("allocated_inr", "sum")).reset_index()
        for r in g.itertuples():
            top = d[d["geo_id"] == r.geo_id].sort_values("priority_score", ascending=False).iloc[0]
            per_district[int(r.geo_id)] = {
                "requests": int(r.requests), "unique_citizens": int(r.unique_citizens), "population": int(r.population),
                "per_1000": round(float(r.unique_citizens) / float(r.population) * 1000, 2), "avg_urgency": round(float(r.avg_urgency), 1),
                "infra_index": round(float(r.infra_index), 1), "priority_score": float(r.priority_score), "hotspot_score": float(r.hotspot_score),
                "allocated_inr_cr": round(float(r.allocated_inr) / 1e7, 1), "top_category": top["category"], "top_category_code": top["category_code"],
                "alignment_quadrant": top["alignment_quadrant"],
            }
    rows = db.query(GeographicEntity.id, GeographicEntity.name, GeographicEntity.code, GeographicEntity.centroid_lat, GeographicEntity.centroid_lng,
                    ST_AsGeoJSON(ST_SimplifyPreserveTopology(GeographicEntity.geom, tolerance))).filter(GeographicEntity.parent_id == state.id, GeographicEntity.geom.isnot(None)).all()
    return {"type": "FeatureCollection", "features": [
        {"type": "Feature", "geometry": json.loads(gj), "properties": {"geo_id": i, "district": n, "code": c, "lat": la, "lng": ln, **per_district.get(i, {})}}
        for i, n, c, la, ln, gj in rows]}
