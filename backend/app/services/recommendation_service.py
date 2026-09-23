"""Recommendation engine. Combines the scored, integrated frame with existing-project context and produces
evidence-backed recommendations. Gemini only writes the explanation, and only from the evidence dict."""
from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd
from sqlalchemy.orm import Session

from app.analytics.aggregation import integrated_frame
from app.analytics.alignment import add_alignment
from app.analytics.hotspots import add_hotspot_score
from app.models import GeographicEntity, Recommendation, RecommendationType
from app.services import priority_service
from app.services.ai import gemini_client

MIN_CITIZENS = 3          # below this, a district×category has no statistically meaningful demand
TOP_N_EXPLAIN = 15        # Gemini explanations are generated for the top N at recompute; others on demand

ACTION_VERBS = {
    "ROADS": "Repair and upgrade all-weather road access", "WATER": "Secure reliable, safe drinking-water supply",
    "SANITATION": "Build or restore drainage and sanitation", "WASTE": "Fix solid-waste collection and processing",
    "ELECTRICITY": "Stabilise electricity supply", "STREETLIGHT": "Restore street lighting and public safety",
    "HEALTH": "Expand primary healthcare capacity", "EDUCATION": "Strengthen school access and staffing",
    "HOUSING": "Address housing and land-tenure needs", "ENVIRONMENT": "Reduce pollution exposure",
    "DISASTER": "Strengthen flood and cyclone resilience", "AGRI": "Expand assured irrigation and farm support",
    "CONNECTIVITY": "Extend mobile and broadband connectivity", "WELFARE": "Unblock welfare-scheme delivery",
    "EMPLOYMENT": "Expand local employment and skilling", "PUBLIC_SPACE": "Improve public spaces and facilities",
}


def _rec_type(row) -> RecommendationType:
    status = row["existing_project_status"]
    if row["alignment_quadrant"] == "POSSIBLE_MISMATCH":
        return RecommendationType.REVIEW_ALLOCATION
    if status in ("PLANNED", "APPROVED", "NOT_STARTED", "STALLED"):
        return RecommendationType.ACCELERATE_EXISTING
    if status == "IN_PROGRESS":
        return RecommendationType.MONITOR_EXISTING
    return RecommendationType.NEW_PROJECT


def _title(row, rec_type: RecommendationType) -> str:
    verb = ACTION_VERBS.get(row["category_code"], "Address citizen-reported problems")
    d = row["district"]
    if rec_type == RecommendationType.ACCELERATE_EXISTING:
        return f"Accelerate '{row['existing_project_name']}' in {d} instead of starting a new project"
    if rec_type == RecommendationType.MONITOR_EXISTING:
        return f"{verb} in {d}: track delivery of '{row['existing_project_name']}' against citizen demand"
    if rec_type == RecommendationType.REVIEW_ALLOCATION:
        return f"Review {row['category'].lower()} allocation in {d}: investment is high relative to reported demand"
    return f"{verb} in {d} (no active project covers this need)"


def _evidence(row) -> dict:
    return {
        "district": row["district"], "category": row["category"],
        "requests": int(row["request_count"]), "unique_citizens": int(row["unique_citizens"]),
        "per_100k_population": round(float(row["per_100k"]), 1), "adjusted_per_100k": round(float(row["adjusted_per_100k"]), 1),
        "connectivity_factor": round(float(row["connectivity_factor"]), 2), "channels_used": int(row["channels"]),
        "clusters": int(row["cluster_count"]), "avg_urgency": round(float(row["avg_urgency"]), 1), "max_urgency": int(row["max_urgency"]),
        "growth_30d_pct": round(float(row["growth_pct"]), 1), "population": int(row["population"]),
        "people_directly_represented": int(row["affected_population"]),
        "infrastructure_index": round(float(row["infra_index"]), 1) if pd.notna(row["infra_index"]) else None,
        "infrastructure_gap": round(float(row["infra_gap"]), 1),
        "allocated_inr_cr": round(float(row["allocated_inr"]) / 1e7, 2), "invest_per_capita_inr": round(float(row["invest_per_capita_inr"]), 1),
        "alignment_quadrant": row["alignment_quadrant"], "misalignment_index": float(row["misalignment_index"]),
        "existing_project": {
            "name": row["existing_project_name"], "status": row["existing_project_status"],
            "budget_inr_cr": round(float(row["existing_project_budget_inr"]) / 1e7, 1) if row["existing_project_budget_inr"] else None,
        } if row["existing_project_name"] else None,
        "hotspot_score": float(row["hotspot_score"]),
    }


def _template_explanation(row, rec_type: RecommendationType, ev: dict) -> str:
    parts = [
        f"{ev['unique_citizens']} citizens ({ev['adjusted_per_100k']} per 100,000 people after connectivity adjustment) reported "
        f"{ev['category'].lower()} problems in {ev['district']} with average urgency {ev['avg_urgency']}/10.",
    ]
    if ev["infrastructure_index"] is not None:
        parts.append(f"The district's {ev['category'].lower()} index is {ev['infrastructure_index']}/100, a gap of {ev['infrastructure_gap']} points.")
    if ev["existing_project"]:
        p = ev["existing_project"]
        parts.append(f"An existing project, '{p['name']}' (₹{p['budget_inr_cr']} Cr, {p['status'].replace('_', ' ').lower()}), already targets this need.")
    else:
        parts.append("No active government project covers this need.")
    parts.append(f"Allocated FY budget: ₹{ev['allocated_inr_cr']} Cr ({ev['alignment_quadrant'].replace('_', ' ').lower()}).")
    return " ".join(parts)


def explain_with_gemini(rec: Recommendation) -> str:
    ev = rec.evidence
    prompt = f"""You are writing a 3-sentence briefing for a senior policymaker in India.
Use ONLY the facts in the JSON below. Do not add any number, place or claim that is not in it.
`people_directly_represented` is only the households behind the reports, NOT the size of the affected area — quote the
district `population` when you need a scale figure, and never call people_directly_represented "the affected population".
State: what citizens report, why it matters (gap, population, urgency), and what the recommended action is and why
(especially whether an existing project should be accelerated rather than duplicated). Plain English, no bullet points.

Recommendation type: {rec.rec_type.value}
Recommendation title: {rec.title}
Priority score: {rec.priority_score} (demand {rec.demand_score}, infrastructure gap {rec.infrastructure_gap_score},
population impact {rec.population_impact_score}, urgency {rec.urgency_score}, policy alignment {rec.policy_alignment_score})
Evidence JSON: {ev}
"""
    return gemini_client.generate_text(prompt, temperature=0.2)


def recompute(db: Session, state_id: int, *, explain_top_n: int = TOP_N_EXPLAIN) -> list[Recommendation]:
    df = integrated_frame(db, state_id)
    if df.empty:
        return []
    df = add_hotspot_score(add_alignment(df))
    df = priority_service.score_frame(db, df)
    keep = (df["unique_citizens"] >= MIN_CITIZENS) | (df["alignment_quadrant"] == "POSSIBLE_MISMATCH")
    df = df[keep].sort_values("priority_score", ascending=False)

    # Only this state's recommendations are superseded: another state's stay current (multi-state deployment).
    state_geo_ids = [g.id for g in db.query(GeographicEntity.id).filter_by(parent_id=state_id)]
    db.query(Recommendation).filter(Recommendation.is_current.is_(True), Recommendation.geo_id.in_(state_geo_ids)).update(
        {"is_current": False}, synchronize_session=False)
    now = datetime.now(timezone.utc)
    out: list[Recommendation] = []
    for _, row in df.iterrows():
        rt = _rec_type(row)
        ev = _evidence(row)
        rec = Recommendation(
            geo_id=int(row["geo_id"]), category_code=row["category_code"], rec_type=rt, title=_title(row, rt),
            priority_score=float(row["priority_score"]), demand_score=float(row["demand_score"]),
            infrastructure_gap_score=float(row["infrastructure_gap_score"]), population_impact_score=float(row["population_impact_score"]),
            urgency_score=float(row["urgency_component"]), policy_alignment_score=float(row["policy_alignment_score"]),
            weights=row["weights"], evidence=ev, existing_project_id=int(row["existing_project_id"]) if pd.notna(row["existing_project_id"]) else None,
            alignment_quadrant=row["alignment_quadrant"], explanation=_template_explanation(row, rt, ev), explanation_model="template",
            confidence=round(min(1.0, 0.5 + min(row["unique_citizens"], 50) / 100 + (0.1 if row["channels"] > 1 else 0)), 2),
            computed_at=now, is_current=True,
        )
        db.add(rec)
        out.append(rec)
    # Commit the deterministic result first. Gemini explanations are slow, and holding this transaction open
    # across those calls would block every other write to the recommendations table.
    db.commit()

    for rec in out[:explain_top_n]:
        try:
            explanation = explain_with_gemini(rec)
        except Exception:  # keep the deterministic explanation if the LLM is unavailable
            continue
        rec.explanation = explanation
        rec.explanation_model = gemini_client.model_name()
        db.commit()
    return out


def dashboard_frame(db: Session, state_id: int) -> pd.DataFrame:
    """Scored frame for dashboard endpoints (hotspots, alignment, geo) without persisting recommendations."""
    df = integrated_frame(db, state_id)
    if df.empty:
        return df
    return priority_service.score_frame(db, add_hotspot_score(add_alignment(df)))
