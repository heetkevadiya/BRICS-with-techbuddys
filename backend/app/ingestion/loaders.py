"""Loaders: seed files → validated rows → government data store, with provenance."""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from geoalchemy2.shape import from_shape
from shapely.geometry import MultiPolygon, shape
from sqlalchemy.orm import Session

from app.ingestion.csv_connector import num, read_csv
from app.ingestion.registry import register_dataset
from app.models import (
    Category,
    Demographics,
    GeographicEntity,
    GeoLevel,
    GovernmentProject,
    InfrastructureIndex,
    InvestmentPlan,
    NationalPriority,
    ProjectStatus,
)

SEED_DIR = Path(__file__).resolve().parents[2] / "data" / "seed"


def _district(db: Session, name: str, state: str | None = None) -> GeographicEntity | None:
    """District names repeat across states (Aurangabad is in both Maharashtra and Bihar), so the
    state qualifies the lookup now that all of India is loaded."""
    hits = db.query(GeographicEntity).filter_by(level=GeoLevel.DISTRICT, name=name).all()
    if state:
        hits = [h for h in hits if h.parent is not None and h.parent.name.lower() == state.lower()]
    return hits[0] if hits else None


def _get_or_create_geo(db: Session, **kw) -> GeographicEntity:
    q = db.query(GeographicEntity).filter_by(country_code=kw["country_code"], level=kw["level"], name=kw["name"])
    g = q.first()
    if g is None:
        g = GeographicEntity(**kw)
        db.add(g)
        db.flush()
    return g


def load_categories(db: Session) -> int:
    data = json.loads((SEED_DIR / "categories.json").read_text())
    for i, c in enumerate(data):
        obj = db.get(Category, c["code"]) or Category(code=c["code"])
        obj.name, obj.names_local, obj.sub_categories = c["name"], c["names_local"], c["sub_categories"]
        obj.department, obj.sdg, obj.infra_index_field, obj.sort_order = c["department"], c["sdg"], c["infra_index_field"], i
        obj.index_source = c.get("index_source", "modelled")
        db.add(obj)
    db.flush()
    return len(data)


def load_projects(db: Session, path: Path = SEED_DIR / "government_projects.csv") -> int:
    def validate(r):
        return {
            "district": r["district"], "state": r.get("state"), "project_name": r["project_name"], "category_code": r["category_code"],
            "department": r.get("department") or None, "scheme": r.get("scheme") or None,
            "budget_inr": num(r["budget_inr_cr"], lo=0) * 1e7, "status": ProjectStatus(r["status"]),
            "planned_year": int(r["planned_year"]) if r.get("planned_year") else None,
            "start_date": date.fromisoformat(r["start_date"]) if r.get("start_date") else None,
            "expected_completion": date.fromisoformat(r["expected_completion"]) if r.get("expected_completion") else None,
        }

    res = read_csv(path, validate)
    if not res.ok:
        raise RuntimeError(f"projects CSV rejected rows: {res.rejected}")
    meta = register_dataset(
        db, dataset_name="Government projects — Gujarat", source="Synthetic, modelled on state budget & PMGSY/JJM/SBM project lists",
        department="Finance / line departments", data_date=date(2026, 8, 1), update_frequency="monthly", is_synthetic=True,
        notes="Demo dataset. Replace with the state's project MIS export via the same connector.",
    )
    db.query(GovernmentProject).delete()
    n = 0
    for r in res.rows:
        g = _district(db, r.pop("district"), r.pop("state", None))
        if not g:
            continue
        db.add(GovernmentProject(geo_id=g.id, dataset_id=meta.id, data_date=meta.data_date, **r))
        n += 1
    meta.row_count = n
    meta.coverage = "Gujarat (pilot state)"
    db.flush()
    return n


def load_investment(db: Session, path: Path = SEED_DIR / "investment_plans.csv") -> int:
    def validate(r):
        return {
            "district": r["district"], "state": r.get("state"), "category_code": r["category_code"], "fiscal_year": r["fiscal_year"],
            "allocated_inr": num(r["allocated_inr_cr"], lo=0) * 1e7, "planned_inr": num(r["planned_inr_cr"], lo=0) * 1e7,
            "spent_inr": num(r["spent_inr_cr"], lo=0) * 1e7,
        }

    res = read_csv(path, validate)
    if not res.ok:
        raise RuntimeError(f"investment CSV rejected rows: {res.rejected}")
    meta = register_dataset(
        db, dataset_name="Public investment plan FY2026-27 — Gujarat", source="Synthetic, modelled on state budget district allocations",
        department="Finance Department", data_date=date(2026, 4, 1), update_frequency="quarterly", is_synthetic=True,
        notes="Demo dataset. INR. Replace with the budget/expenditure MIS export via the same connector.",
    )
    db.query(InvestmentPlan).delete()
    n = 0
    for r in res.rows:
        g = _district(db, r.pop("district"), r.pop("state", None))
        if not g:
            continue
        db.add(InvestmentPlan(geo_id=g.id, dataset_id=meta.id, data_date=meta.data_date, **r))
        n += 1
    meta.row_count = n
    meta.coverage = "Gujarat (pilot state)"
    db.flush()
    return n


def load_national_priorities(db: Session) -> int:
    data = json.loads((SEED_DIR / "national_priorities.json").read_text())
    meta = register_dataset(
        db, dataset_name="National priority programmes", source="Union & state flagship programmes (public documents)",
        department="NITI Aayog / line ministries", data_date=date(2026, 4, 1), update_frequency="annual",
        notes="Programme-to-category mapping and target districts curated for the demo.",
    )
    db.query(NationalPriority).delete()
    name_to_id = {g.name: g.id for g in db.query(GeographicEntity).filter_by(level=GeoLevel.DISTRICT)}  # first match wins
    for p in data:
        db.add(NationalPriority(
            programme=p["programme"], category_code=p["category_code"], quantified_target=p["quantified_target"],
            sdg=p["sdg"], target_geo_ids=[name_to_id[d] for d in p["target_districts"] if d in name_to_id],
            dataset_id=meta.id, data_date=meta.data_date,
        ))
    meta.row_count = len(data)
    meta.coverage = "India — all states"
    db.flush()
    return len(data)
