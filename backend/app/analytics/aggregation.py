"""Deterministic aggregation: citizen demand per district × category, joined with government data.

This is the single table every downstream number (hotspots, gap, alignment, priority) is derived from,
so the derivation of every figure shown to a policymaker can be traced back here.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pandas as pd
from sqlalchemy import String, case, cast, func
from sqlalchemy.orm import Session

from app.models import (
    Category,
    CitizenRequest,
    Demographics,
    GeographicEntity,
    GeoLevel,
    GovernmentProject,
    InfrastructureIndex,
    InvestmentPlan,
    ProcessingStatus,
    ProjectStatus,
    RequestCluster,
)

HOUSEHOLD_SIZE = 4.6          # Census 2011 average household size, India
SMALL_POP_GUARD = 50_000      # below this, per-100k rates are smoothed toward the state mean
VALID_STATUSES = (ProcessingStatus.PROCESSED, ProcessingStatus.REVIEW_REQUIRED)


def _citizen_key():
    # unique citizen = hashed identifier when we have one, else the request itself
    return func.coalesce(CitizenRequest.citizen_hash, cast(CitizenRequest.id, String))


def demand_by_district_category(db: Session, state_id: int, now: datetime | None = None) -> pd.DataFrame:
    now = now or datetime.now(timezone.utc)
    d30, d60 = now - timedelta(days=30), now - timedelta(days=60)
    base = (
        db.query(
            CitizenRequest.resolved_geo_id.label("geo_id"),
            CitizenRequest.category_code.label("category_code"),
            func.count(CitizenRequest.id).label("request_count"),
            func.count(func.distinct(_citizen_key())).label("unique_citizens"),
            func.avg(CitizenRequest.urgency_score).label("avg_urgency"),
            func.max(CitizenRequest.urgency_score).label("max_urgency"),
            func.sum(case((CitizenRequest.submitted_at >= d30, 1), else_=0)).label("last_30d"),
            func.sum(case(((CitizenRequest.submitted_at >= d60) & (CitizenRequest.submitted_at < d30), 1), else_=0)).label("prev_30d"),
            func.count(func.distinct(CitizenRequest.channel)).label("channels"),

            func.count(func.distinct(CitizenRequest.cluster_id)).label("cluster_count"),
        )
        .join(GeographicEntity, GeographicEntity.id == CitizenRequest.resolved_geo_id)
        .filter(
            GeographicEntity.parent_id == state_id,
            CitizenRequest.processing_status.in_(VALID_STATUSES),
            CitizenRequest.is_flagged.is_(False),
            CitizenRequest.category_code.isnot(None),
        )
        .group_by(CitizenRequest.resolved_geo_id, CitizenRequest.category_code)
    )
    demand = pd.DataFrame([dict(r._mapping) for r in base.all()])
    if demand.empty:
        demand = pd.DataFrame(columns=["geo_id", "category_code", "request_count", "unique_citizens", "avg_urgency", "max_urgency",
                                       "last_30d", "prev_30d", "channels", "cluster_count"])
    return demand


def government_frame(db: Session, state_id: int) -> pd.DataFrame:
    """One row per district × category with population, infra index, investment and existing projects."""
    districts = db.query(GeographicEntity).filter_by(parent_id=state_id, level=GeoLevel.DISTRICT).all()
    cats = db.query(Category).filter(Category.is_active.is_(True), Category.infra_index_field.isnot(None)).all()
    demo = {d.geo_id: d for d in db.query(Demographics).filter(Demographics.geo_id.in_([g.id for g in districts]))}
    infra = {i.geo_id: i for i in db.query(InfrastructureIndex).filter(InfrastructureIndex.geo_id.in_([g.id for g in districts]))}
    inv = {(i.geo_id, i.category_code): i for i in db.query(InvestmentPlan).filter(InvestmentPlan.geo_id.in_([g.id for g in districts]))}
    projects: dict[tuple[int, str], list[GovernmentProject]] = {}
    for p in db.query(GovernmentProject).filter(GovernmentProject.geo_id.in_([g.id for g in districts])):
        projects.setdefault((p.geo_id, p.category_code), []).append(p)

    rows = []
    for g in districts:
        dm, inf = demo.get(g.id), infra.get(g.id)
        for c in cats:
            iv = inv.get((g.id, c.code))
            active = [p for p in projects.get((g.id, c.code), []) if p.status != ProjectStatus.COMPLETED]
            rows.append({
                "geo_id": g.id, "district": g.name, "category_code": c.code, "category": c.name,
                "population": dm.population if dm else None,
                "mobile_penetration_pct": dm.mobile_penetration_pct if dm else None,
                "infra_index": getattr(inf, c.infra_index_field) if inf else None,
                "allocated_inr": iv.allocated_inr if iv else 0.0,
                "planned_inr": iv.planned_inr if iv else 0.0,
                "spent_inr": iv.spent_inr if iv else 0.0,
                "existing_project_id": active[0].id if active else None,
                "existing_project_name": active[0].project_name if active else None,
                "existing_project_status": active[0].status.value if active else None,
                "existing_project_budget_inr": active[0].budget_inr if active else None,
                "active_projects": len(active),
            })
    return pd.DataFrame(rows)


def integrated_frame(db: Session, state_id: int, now: datetime | None = None) -> pd.DataFrame:
    """Citizen demand ⟂ government data, plus the derived, normalised measures every engine uses."""
    gov = government_frame(db, state_id)
    if gov.empty:
        return gov
    demand = demand_by_district_category(db, state_id, now)
    df = gov.merge(demand, on=["geo_id", "category_code"], how="left")
    for col in ("request_count", "unique_citizens", "last_30d", "prev_30d", "channels", "cluster_count"):
        df[col] = df[col].fillna(0).astype(int)
    df["avg_urgency"] = df["avg_urgency"].astype(float).fillna(0.0)
    df["max_urgency"] = df["max_urgency"].astype(float).fillna(0.0)

    # --- per-capita demand (blueprint: never rank by raw counts) ---
    df["per_100k"] = df["unique_citizens"] / df["population"] * 100_000
    state_mean = df.loc[df["unique_citizens"] > 0, "per_100k"].mean() if (df["unique_citizens"] > 0).any() else 0.0
    small = df["population"] < SMALL_POP_GUARD
    w = (df["population"] / SMALL_POP_GUARD).clip(upper=1.0)
    df.loc[small, "per_100k"] = w[small] * df.loc[small, "per_100k"] + (1 - w[small]) * state_mean

    # --- connectivity adjustment: low-penetration districts under-report, scale toward the state average ---
    pen = df["mobile_penetration_pct"].fillna(df["mobile_penetration_pct"].mean())
    df["connectivity_factor"] = (pen.mean() / pen).clip(lower=0.8, upper=1.6)
    df["adjusted_per_100k"] = df["per_100k"] * df["connectivity_factor"]

    # --- growth, gap, investment per capita, affected population ---
    df["growth_pct"] = df.apply(
        lambda r: ((r["last_30d"] - r["prev_30d"]) / r["prev_30d"] * 100) if r["prev_30d"] else (100.0 if r["last_30d"] else 0.0), axis=1
    )
    df["infra_gap"] = (100 - df["infra_index"].astype(float)).clip(lower=0, upper=100)
    df["invest_per_capita_inr"] = df["allocated_inr"] / df["population"]
    # People directly represented by the citizens who reported. Deliberately NOT the sum of the model's
    # per-request population guesses: those overlap heavily and summing them double-counts.
    df["affected_population"] = (df["unique_citizens"] * HOUSEHOLD_SIZE).clip(upper=df["population"]).astype(int)
    return df


def trend_series(db: Session, state_id: int, *, geo_id: int | None = None, category_code: str | None = None, months: int = 6) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=30 * months)
    month = func.date_trunc("month", CitizenRequest.submitted_at).label("month")
    q = (
        db.query(month, CitizenRequest.category_code, func.count(func.distinct(_citizen_key())).label("unique_citizens"),
                 func.count(CitizenRequest.id).label("requests"))
        .join(GeographicEntity, GeographicEntity.id == CitizenRequest.resolved_geo_id)
        .filter(GeographicEntity.parent_id == state_id, CitizenRequest.submitted_at >= since,
                CitizenRequest.processing_status.in_(VALID_STATUSES), CitizenRequest.is_flagged.is_(False))
    )
    if geo_id:
        q = q.filter(CitizenRequest.resolved_geo_id == geo_id)
    if category_code:
        q = q.filter(CitizenRequest.category_code == category_code)
    q = q.group_by(month, CitizenRequest.category_code).order_by(month)
    return [{"month": r.month.strftime("%Y-%m"), "category_code": r.category_code, "unique_citizens": r.unique_citizens, "requests": r.requests} for r in q]


def cluster_list(db: Session, state_id: int, *, geo_id: int | None = None, category_code: str | None = None, limit: int = 50) -> list[dict]:
    q = db.query(RequestCluster, GeographicEntity.name).join(GeographicEntity, GeographicEntity.id == RequestCluster.geo_id).filter(GeographicEntity.parent_id == state_id)
    if geo_id:
        q = q.filter(RequestCluster.geo_id == geo_id)
    if category_code:
        q = q.filter(RequestCluster.category_code == category_code)
    q = q.order_by(RequestCluster.unique_citizens.desc()).limit(limit)
    return [{"id": c.id, "name": c.name, "district": name, "geo_id": c.geo_id, "category_code": c.category_code,
             "representative_problem": c.representative_problem, "request_count": c.request_count,
             "unique_citizens": c.unique_citizens, "average_urgency": round(c.average_urgency, 1) if c.average_urgency else None}
            for c, name in q]
