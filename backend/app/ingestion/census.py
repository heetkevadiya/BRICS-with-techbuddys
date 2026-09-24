"""Census of India 2011 → geography, demographics and the infrastructure indices we can honestly derive.

Six of the sixteen indices come straight out of the census household-amenity tables. The rest
(roads, healthcare facilities, waste, irrigation …) are not in the census and are modelled
separately in `loaders.load_modelled_indices`, which labels them as such. Keeping the two apart
is the point: a policymaker must be able to tell a measured number from an estimated one.
"""
from __future__ import annotations

import csv
import json
import re
from datetime import date
from pathlib import Path

RAW = Path(__file__).resolve().parents[2] / "data" / "raw" / "india"
CENSUS_CSV = RAW / "census_2011_districts.csv"
BOUNDARIES = RAW / "india_districts.geojson"

CENSUS_DATE = date(2011, 3, 1)

# index name → (numerator column, denominator column). All become 0–100, higher is better.
DERIVED_INDICES = {
    "electricity_index": ("Housholds_with_Electric_Lighting", "Households"),
    "water_index": ("Main_source_of_drinking_water_Tapwater_Households", "Households"),
    "sanitation_index": ("Having_latrine_facility_within_the_premises_Total_Households", "Households"),
    "connectivity_index": ("Households_with_Telephone_Mobile_Phone", "Households"),
}


def _norm(s: str) -> str:
    """Census names and boundary names differ in case, punctuation and spelling."""
    s = s.lower().strip()
    s = re.sub(r"\b(district|dist\.?)\b", "", s)
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s


def load_boundaries() -> tuple[dict[str, dict], dict[tuple[str, str], dict]]:
    """Boundaries indexed two ways: by Census district code (reliable) and by (state, district)
    name as the fallback for the features whose code is missing or was renumbered."""
    fc = json.loads(BOUNDARIES.read_text())
    by_code: dict[str, dict] = {}
    by_name: dict[tuple[str, str], dict] = {}
    for f in fc["features"]:
        p = f["properties"]
        name = p.get("district")
        if not name:
            continue  # a few features carry only a state; nothing to join a district row to
        entry = {
            "geometry": f["geometry"], "district": name, "state": p["st_nm"],
            "district_code": p.get("dt_code"), "state_code": p.get("st_code"),
        }
        if entry["district_code"]:
            by_code.setdefault(str(int(entry["district_code"])), entry)
        by_name.setdefault((_norm(p["st_nm"]), _norm(name)), entry)
    return by_code, by_name


def match_boundary(row: dict, by_code: dict, by_name: dict) -> dict | None:
    """Census code first; fall back to the normalised (state, district) name."""
    return by_code.get(str(int(row["census_code"]))) or by_name.get(row["key"])


def read_census() -> list[dict]:
    """One row per district with real population, literacy and household-amenity shares."""
    rows = []
    for r in csv.DictReader(CENSUS_CSV.open(encoding="utf-8")):
        pop = _int(r.get("Population"))
        households = _int(r.get("Households"))
        if not pop or not households:
            continue
        name = r["District name"].strip()
        state = r["State name"].strip().title()
        rural_h, urban_h = _int(r.get("Rural_Households")), _int(r.get("Urban_Households"))
        total_h = (rural_h or 0) + (urban_h or 0) or households
        dilapidated = _int(r.get("Condition_of_occupied_census_houses_Dilapidated_Households")) or 0

        row = {
            "census_code": r["District code"].strip(),
            "district": name,
            "state": state,
            "key": (_norm(state), _norm(name)),
            "population": pop,
            "households": households,
            "literacy_rate": _pct(_int(r.get("Literate")), pop),
            "urban_population_pct": _pct(urban_h, total_h),
            "mobile_penetration_pct": _pct(_int(r.get("Households_with_Telephone_Mobile_Phone")), households),
            "internet_pct": _pct(_int(r.get("Households_with_Internet")), households),
            "housing_index": round(100 - (dilapidated / households * 100), 1),
        }
        for index, (num, den) in DERIVED_INDICES.items():
            row[index] = _pct(_int(r.get(num)), _int(r.get(den)))
        # literacy is the only education signal the census gives us
        row["education_index"] = row["literacy_rate"]
        rows.append(row)
    return rows


def _int(v) -> int | None:
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def _pct(num, den) -> float | None:
    if not num or not den:
        return None
    return round(min(100.0, num / den * 100), 1)
