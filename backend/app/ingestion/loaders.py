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
        db.add(obj)
    db.flush()
    return len(data)


def load_geography_gujarat(db: Session) -> dict[str, GeographicEntity]:
    """India → Gujarat → 34 districts, with census codes, aliases and real boundaries."""
    india = _get_or_create_geo(db, country_code="IN", level=GeoLevel.COUNTRY, name="India", code="IN")
    gujarat = _get_or_create_geo(db, country_code="IN", level=GeoLevel.STATE, name="Gujarat", code="24", parent_id=india.id,
                                 aliases="ગુજરાત|गुजरात", centroid_lat=22.3, centroid_lng=71.6)
    geoms = {f["properties"]["district"]: f["geometry"] for f in json.loads((SEED_DIR / "gujarat_districts.geojson").read_text())["features"]}

    def validate(r):
        return {
            "name": r["name"], "census_code": r["census_code"],
            "population": int(num(r["population"], lo=1)),
            "urban_pct": num(r["urban_pct"], lo=0, hi=100), "literacy_rate": num(r["literacy_rate"], lo=0, hi=100),
            "mobile_penetration_pct": num(r["mobile_penetration_pct"], lo=0, hi=100), "aliases": r.get("aliases", ""),
        }

    res = read_csv(SEED_DIR / "gujarat_districts.csv", validate)
    if not res.ok:
        raise RuntimeError(f"district CSV rejected rows: {res.rejected}")

    meta = register_dataset(
        db, dataset_name="Demographics — Gujarat districts", source="Census of India 2011 (district totals; post-2013 districts estimated)",
        source_url="https://censusindia.gov.in", department="Registrar General of India", data_date=date(2011, 3, 1),
        update_frequency="decennial", license="Government Open Data License – India",
        notes="Mobile penetration is an illustrative estimate. Populations for districts formed after 2011 are apportioned from parent districts.",
    )
    out = {}
    for r in res.rows:
        geom = geoms.get(r["name"])
        shp = shape(geom) if geom else None
        if shp is not None and shp.geom_type == "Polygon":
            shp = MultiPolygon([shp])
        g = _get_or_create_geo(db, country_code="IN", level=GeoLevel.DISTRICT, name=r["name"], code=r["census_code"], parent_id=gujarat.id)
        g.aliases = r["aliases"]
        if shp is not None:
            g.geom = from_shape(shp, srid=4326)
            c = shp.centroid
            g.centroid_lat, g.centroid_lng = c.y, c.x
        db.query(Demographics).filter_by(geo_id=g.id).delete()
        db.add(Demographics(
            geo_id=g.id, population=r["population"], urban_population_pct=r["urban_pct"],
            rural_population_pct=100 - r["urban_pct"], literacy_rate=r["literacy_rate"],
            mobile_penetration_pct=r["mobile_penetration_pct"], dataset_id=meta.id, data_date=meta.data_date,
        ))
        out[r["name"]] = g
    meta.row_count = len(out)
    db.flush()
    return out


def load_infrastructure(db: Session, path: Path = SEED_DIR / "infrastructure_indices.csv") -> int:
    fields = [c.name for c in InfrastructureIndex.__table__.columns if c.name.endswith("_index")]

    def validate(r):
        out = {"district": r["district"]}
        for f in fields:
            out[f] = num(r.get(f), lo=0, hi=100, allow_blank=True)
        return out

    res = read_csv(path, validate)
    if not res.ok:
        raise RuntimeError(f"infrastructure CSV rejected rows: {res.rejected}")
    meta = register_dataset(
        db, dataset_name="Infrastructure indices — Gujarat districts", source="Synthetic composite modelled on NITI Aayog / DISHA-style district indicators",
        department="Multiple (R&B, WSD, Health, Education, DISCOM)", data_date=date(2026, 3, 31), update_frequency="quarterly",
        is_synthetic=True, notes="Demo dataset. 0–100, higher is better. Replace with official indices via the same connector.",
    )
    n = 0
    for r in res.rows:
        g = db.query(GeographicEntity).filter_by(level=GeoLevel.DISTRICT, name=r.pop("district")).first()
        if not g:
            continue
        db.query(InfrastructureIndex).filter_by(geo_id=g.id).delete()
        db.add(InfrastructureIndex(geo_id=g.id, dataset_id=meta.id, data_date=meta.data_date, **r))
        n += 1
    meta.row_count = n
    db.flush()
    return n


def load_projects(db: Session, path: Path = SEED_DIR / "government_projects.csv") -> int:
    def validate(r):
        return {
            "district": r["district"], "project_name": r["project_name"], "category_code": r["category_code"],
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
        g = db.query(GeographicEntity).filter_by(level=GeoLevel.DISTRICT, name=r.pop("district")).first()
        if not g:
            continue
        db.add(GovernmentProject(geo_id=g.id, dataset_id=meta.id, data_date=meta.data_date, **r))
        n += 1
    meta.row_count = n
    db.flush()
    return n


def load_investment(db: Session, path: Path = SEED_DIR / "investment_plans.csv") -> int:
    def validate(r):
        return {
            "district": r["district"], "category_code": r["category_code"], "fiscal_year": r["fiscal_year"],
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
        g = db.query(GeographicEntity).filter_by(level=GeoLevel.DISTRICT, name=r.pop("district")).first()
        if not g:
            continue
        db.add(InvestmentPlan(geo_id=g.id, dataset_id=meta.id, data_date=meta.data_date, **r))
        n += 1
    meta.row_count = n
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
    name_to_id = {g.name: g.id for g in db.query(GeographicEntity).filter_by(level=GeoLevel.DISTRICT)}
    for p in data:
        db.add(NationalPriority(
            programme=p["programme"], category_code=p["category_code"], quantified_target=p["quantified_target"],
            sdg=p["sdg"], target_geo_ids=[name_to_id[d] for d in p["target_districts"] if d in name_to_id],
            dataset_id=meta.id, data_date=meta.data_date,
        ))
    meta.row_count = len(data)
    db.flush()
    return len(data)
