from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models import DecisionType, RecommendationType


class SummaryOut(BaseModel):
    state: str
    total_requests: int
    unique_citizens: int
    districts_reporting: int
    languages: dict[str, int]
    channels: dict[str, int]
    review_required: int
    per_1000_population: float
    growth_30d_pct: float
    top_categories: list[dict]
    datasets: list[dict]


class HotspotOut(BaseModel):
    geo_id: int
    district: str
    category_code: str
    category: str
    requests: int
    unique_citizens: int
    per_1000: float
    adjusted_per_1000: float
    avg_urgency: float
    growth_pct: float
    population: int
    people_directly_represented: int
    infra_index: float | None
    infra_gap: float
    allocated_inr_cr: float
    alignment_quadrant: str
    existing_project: str | None
    existing_project_status: str | None
    hotspot_score: float
    priority_score: float
    clusters: int


class RecommendationOut(BaseModel):
    id: int
    geo_id: int
    district: str
    category_code: str
    category: str
    rec_type: RecommendationType
    title: str
    priority_score: float
    demand_score: float
    infrastructure_gap_score: float
    population_impact_score: float
    urgency_score: float
    policy_alignment_score: float
    weights: dict
    evidence: dict
    alignment_quadrant: str | None
    explanation: str | None
    explanation_model: str | None
    confidence: float | None
    computed_at: datetime
    decision: str | None = None


class DecisionIn(BaseModel):
    decision: DecisionType
    note: str | None = None
