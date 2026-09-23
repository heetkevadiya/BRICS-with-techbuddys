"""The priority engine. Deterministic, reproducible, explainable. No LLM anywhere in this file.

Priority = 0.30·Demand + 0.25·InfrastructureGap + 0.20·PopulationImpact + 0.15·Urgency + 0.10·PolicyAlignment
Every input is normalised to 0–100 and returned alongside the result so the dashboard can show the breakdown.
"""
from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass

import pandas as pd
from sqlalchemy.orm import Session

from app.models import NationalPriority

DEFAULT_WEIGHTS = {"demand": 0.30, "infrastructure_gap": 0.25, "population_impact": 0.20, "urgency": 0.15, "policy_alignment": 0.10}


def weights() -> dict[str, float]:
    """Weights are configuration; a country/state can override via PRIORITY_WEIGHTS='{"demand":0.35,...}'."""
    w = dict(DEFAULT_WEIGHTS)
    if os.environ.get("PRIORITY_WEIGHTS"):
        w.update(json.loads(os.environ["PRIORITY_WEIGHTS"]))
    total = sum(w.values())
    return {k: v / total for k, v in w.items()}


@dataclass
class PriorityBreakdown:
    demand: float
    infrastructure_gap: float
    population_impact: float
    urgency: float
    policy_alignment: float
    priority: float
    weights: dict

    def as_dict(self) -> dict:
        return asdict(self)


def _minmax(s: pd.Series) -> pd.Series:
    lo, hi = s.min(), s.max()
    return ((s - lo) / (hi - lo) * 100) if hi > lo else s * 0 + (100 if hi > 0 else 0)


def policy_alignment_scores(db: Session, df: pd.DataFrame) -> pd.Series:
    """Rule-based: +40 priority sector, +30 district is a programme target, +20 quantified target exists, +10 SDG tagged."""
    prios = db.query(NationalPriority).all()
    by_cat: dict[str, list[NationalPriority]] = {}
    for p in prios:
        by_cat.setdefault(p.category_code, []).append(p)

    def score(row) -> float:
        ps = by_cat.get(row["category_code"], [])
        if not ps:
            return 0.0
        s = 40.0
        if any(row["geo_id"] in (p.target_geo_ids or []) for p in ps):
            s += 30
        if any(p.quantified_target for p in ps):
            s += 20
        if any(p.sdg for p in ps):
            s += 10
        return min(s, 100.0)

    return df.apply(score, axis=1)


def score_frame(db: Session, df: pd.DataFrame) -> pd.DataFrame:
    """Add the five normalised components and the priority to an integrated frame (see analytics.aggregation)."""
    df = df.copy()
    w = weights()
    active = df["unique_citizens"] > 0
    df["demand_score"] = 0.0
    df.loc[active, "demand_score"] = _minmax(df.loc[active, "adjusted_per_100k"]).round(1)
    df["infrastructure_gap_score"] = df["infra_gap"].round(1)
    df["population_impact_score"] = 0.0
    df.loc[active, "population_impact_score"] = _minmax(df.loc[active, "affected_population"].pow(0.5)).round(1)
    df["urgency_component"] = (df["avg_urgency"] * 10).clip(0, 100).round(1)
    df["policy_alignment_score"] = policy_alignment_scores(db, df).round(1)
    df["priority_score"] = (
        w["demand"] * df["demand_score"]
        + w["infrastructure_gap"] * df["infrastructure_gap_score"]
        + w["population_impact"] * df["population_impact_score"]
        + w["urgency"] * df["urgency_component"]
        + w["policy_alignment"] * df["policy_alignment_score"]
    ).round(1)
    df.loc[~active, "priority_score"] = 0.0
    df["weights"] = [w] * len(df)
    return df


def compute_priority(*, demand: float, infrastructure_gap: float, population_impact: float, urgency: float,
                     policy_alignment: float, w: dict[str, float] | None = None) -> PriorityBreakdown:
    """Pure function for a single row — used by tests and by the explain endpoint."""
    w = w or weights()
    for name, v in (("demand", demand), ("infrastructure_gap", infrastructure_gap), ("population_impact", population_impact),
                    ("urgency", urgency), ("policy_alignment", policy_alignment)):
        if not 0 <= v <= 100:
            raise ValueError(f"{name} must be 0–100, got {v}")
    p = (w["demand"] * demand + w["infrastructure_gap"] * infrastructure_gap + w["population_impact"] * population_impact
         + w["urgency"] * urgency + w["policy_alignment"] * policy_alignment)
    return PriorityBreakdown(demand, infrastructure_gap, population_impact, urgency, policy_alignment, round(p, 1), w)
