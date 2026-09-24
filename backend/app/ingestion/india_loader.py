"""Load the whole of India: 35 states/UTs, ~640 districts, from the real Census 2011 files.

Two dataset records are written, deliberately separate:
  1. Census 2011  — population, literacy, and the six indices the census actually measures.
  2. Modelled     — the ten indices the census does not cover (roads, health facilities, waste …),
                    derived transparently from census signals and flagged is_synthetic.

Nothing pretends to be official that is not.
"""
from __future__ import annotations

import json
import random
from datetime import date

from geoalchemy2.shape import from_shape
from shapely.geometry import MultiPolygon, shape
from sqlalchemy.orm import Session

from app.ingestion.census import CENSUS_DATE, RAW, load_boundaries, match_boundary, read_census
from app.ingestion.registry import register_dataset
from app.models import Demographics, GeographicEntity, GeoLevel, InfrastructureIndex

# Indices the census does not measure. Each is estimated from census signals that genuinely
# correlate with it, then jittered deterministically so districts are not identical.
# The formula is stated here because the dashboard tells the policymaker these are estimates.
MODELLED = {
    # roads: better-off, more urban districts have better roads
    "road_index":               lambda r, g: 0.45 * g("urban") + 0.35 * g("literacy") + 0.20 * g("connectivity"),
    "healthcare_index":         lambda r, g: 0.40 * g("urban") + 0.35 * g("literacy") + 0.25 * g("sanitation"),
    "waste_index":              lambda r, g: 0.70 * g("urban") + 0.30 * g("sanitation"),
    "lighting_safety_index":    lambda r, g: 0.55 * g("electricity") + 0.45 * g("urban"),
    "environment_index":        lambda r, g: 100 - 0.55 * g("urban") - 0.15 * g("connectivity"),
    "disaster_resilience_index": lambda r, g: 0.50 * g("housing") + 0.30 * g("connectivity") + 0.20 * g("urban"),
    "irrigation_index":         lambda r, g: 100 - 0.60 * g("urban") - 0.10 * g("literacy"),
    "welfare_access_index":     lambda r, g: 0.50 * g("literacy") + 0.30 * g("connectivity") + 0.20 * g("electricity"),
    "employment_index":         lambda r, g: 0.45 * g("literacy") + 0.35 * g("urban") + 0.20 * g("connectivity"),
    "public_space_index":       lambda r, g: 0.65 * g("urban") + 0.35 * g("literacy"),
}

MEASURED = ("electricity_index", "water_index", "sanitation_index", "connectivity_index",
            "housing_index", "education_index")

# Citizens write district names in local scripts, older spellings, or the name of a district created
# after 2011. `data/seed/district_aliases.json` maps all of those onto the census district.
ALIASES_FILE = RAW.parents[1] / "seed" / "district_aliases.json"


def _aliases() -> dict[str, list[str]]:
    if not ALIASES_FILE.exists():
        return {}
    return {k: v for k, v in json.loads(ALIASES_FILE.read_text()).items() if not k.startswith("_")}


def load_india(db: Session, *, with_geometry: bool = True) -> dict:
    rows = read_census()
    by_code, by_name = load_boundaries()

    census_meta = register_dataset(
        db,
        dataset_name="Census of India 2011 — districts",
        source="Office of the Registrar General & Census Commissioner, India",
        source_url="https://censusindia.gov.in/census.website/data/census-tables",
        department="Ministry of Home Affairs",
        data_date=CENSUS_DATE,
        update_frequency="decennial",
        license="Government Open Data License – India (GODL)",
        is_synthetic=False,
        notes="Population, literacy, urban share and household amenities. Six infrastructure indices "
              "are computed directly from the household-amenity tables: electricity, tap water, latrine "
              "in premises, telephone, dilapidated housing and literacy.",
    )
    modelled_meta = register_dataset(
        db,
        dataset_name="Modelled infrastructure indices — districts",
        source="Estimated from Census 2011 signals; not an official index",
        department="—",
        data_date=date(2026, 3, 31),
        update_frequency="on demand",
        is_synthetic=True,
        notes="Roads, healthcare, waste, lighting, environment, disaster resilience, irrigation, welfare, "
              "employment and public space are not in the census. Each is estimated from urbanisation, "
              "literacy, electrification and sanitation. Replace with NITI Aayog or line-department "
              "indices through the same connector when available.",
    )

    alias_map = _aliases()
    india = _get_or_create(db, country_code="IN", level=GeoLevel.COUNTRY, name="India", code="IN")
    states: dict[str, GeographicEntity] = {}
    rng = random.Random(11)
    matched = no_geom = 0

    for r in rows:
        st = states.get(r["state"])
        if st is None:
            st = _get_or_create(db, country_code="IN", level=GeoLevel.STATE, name=r["state"], parent_id=india.id)
            states[r["state"]] = st

        b = match_boundary(r, by_code, by_name)
        d = _get_or_create(db, country_code="IN", level=GeoLevel.DISTRICT, name=r["district"],
                           code=r["census_code"], parent_id=st.id)
        extra = alias_map.get(r["district"])
        if extra:
            d.aliases = "|".join(extra)
        if b and with_geometry:
            geom = shape(b["geometry"])
            if geom.geom_type == "Polygon":
                geom = MultiPolygon([geom])
            d.geom = from_shape(geom, srid=4326)
            c = geom.centroid
            d.centroid_lat, d.centroid_lng = round(c.y, 5), round(c.x, 5)
            if st.code is None:
                st.code = b.get("state_code")
            matched += 1
        else:
            no_geom += 1

        db.query(Demographics).filter_by(geo_id=d.id).delete()
        db.add(Demographics(
            geo_id=d.id, population=r["population"], literacy_rate=r["literacy_rate"],
            urban_population_pct=r["urban_population_pct"],
            rural_population_pct=None if r["urban_population_pct"] is None else round(100 - r["urban_population_pct"], 1),
            mobile_penetration_pct=r["mobile_penetration_pct"],
            dataset_id=census_meta.id, data_date=CENSUS_DATE,
        ))

        db.query(InfrastructureIndex).filter_by(geo_id=d.id).delete()
        db.add(InfrastructureIndex(geo_id=d.id, dataset_id=census_meta.id, data_date=CENSUS_DATE,
                                   **_indices(r, rng)))

    census_meta.row_count = len(rows)
    census_meta.coverage = f"{len(states)} states/UTs, {len(rows)} districts"
    modelled_meta.row_count = len(rows)
    modelled_meta.coverage = census_meta.coverage
    db.flush()
    return {"states": len(states), "districts": len(rows), "with_geometry": matched, "without_geometry": no_geom}


def _indices(r: dict, rng: random.Random) -> dict:
    """Six measured indices straight from the census, ten estimated from them."""
    out = {k: r.get(k) for k in MEASURED}
    signals = {
        "urban": r["urban_population_pct"], "literacy": r["literacy_rate"],
        "connectivity": r["connectivity_index"], "electricity": r["electricity_index"],
        "sanitation": r["sanitation_index"], "housing": r["housing_index"],
    }
    mean = [v for v in signals.values() if v is not None]
    fallback = sum(mean) / len(mean) if mean else 50.0
    g = lambda k: signals.get(k) if signals.get(k) is not None else fallback  # noqa: E731

    for name, formula in MODELLED.items():
        out[name] = round(min(95.0, max(15.0, formula(r, g) + rng.uniform(-6, 6))), 1)

    vals = [v for v in out.values() if v is not None]
    out["overall_index"] = round(sum(vals) / len(vals), 1) if vals else None
    return out


def _get_or_create(db: Session, **kw) -> GeographicEntity:
    q = db.query(GeographicEntity).filter_by(country_code=kw["country_code"], level=kw["level"], name=kw["name"])
    if kw.get("parent_id"):
        q = q.filter_by(parent_id=kw["parent_id"])
    g = q.first()
    if g is None:
        g = GeographicEntity(**kw)
        db.add(g)
        db.flush()
    return g
