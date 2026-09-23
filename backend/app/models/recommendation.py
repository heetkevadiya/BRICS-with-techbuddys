"""World C: analysis outputs. A recommendation carries its full evidence and every sub-score."""
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class RecommendationType(str, enum.Enum):
    NEW_PROJECT = "NEW_PROJECT"
    ACCELERATE_EXISTING = "ACCELERATE_EXISTING"
    MONITOR_EXISTING = "MONITOR_EXISTING"
    REVIEW_ALLOCATION = "REVIEW_ALLOCATION"


class Recommendation(TimestampMixin, Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    geo_id: Mapped[int] = mapped_column(ForeignKey("geographic_entities.id"), index=True)
    category_code: Mapped[str] = mapped_column(ForeignKey("categories.code"), index=True)
    rec_type: Mapped[RecommendationType] = mapped_column(Enum(RecommendationType, name="recommendation_type"))
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    priority_score: Mapped[float] = mapped_column(Float, nullable=False)
    demand_score: Mapped[float] = mapped_column(Float)
    infrastructure_gap_score: Mapped[float] = mapped_column(Float)
    population_impact_score: Mapped[float] = mapped_column(Float)
    urgency_score: Mapped[float] = mapped_column(Float)
    policy_alignment_score: Mapped[float] = mapped_column(Float)
    weights: Mapped[dict] = mapped_column(JSON)  # the exact weights used, for reproducibility

    evidence: Mapped[dict] = mapped_column(JSON)  # raw numbers behind every sub-score
    existing_project_id: Mapped[int | None] = mapped_column(ForeignKey("government_projects.id"))
    alignment_quadrant: Mapped[str | None] = mapped_column(String(32))
    explanation: Mapped[str | None] = mapped_column(Text)  # Gemini, grounded in `evidence` only
    explanation_model: Mapped[str | None] = mapped_column(String(60))
    confidence: Mapped[float | None] = mapped_column(Float)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_current: Mapped[bool] = mapped_column(default=True, index=True)

    geo = relationship("GeographicEntity")
    category = relationship("Category")
    existing_project = relationship("GovernmentProject")
    decisions = relationship("Decision", back_populates="recommendation")


class DecisionType(str, enum.Enum):
    ACCEPT = "ACCEPT"
    DEFER = "DEFER"
    REJECT = "REJECT"


class Decision(TimestampMixin, Base):
    __tablename__ = "decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recommendation_id: Mapped[int] = mapped_column(ForeignKey("recommendations.id"), index=True)
    policymaker_id: Mapped[str] = mapped_column(String(120), nullable=False)
    decision: Mapped[DecisionType] = mapped_column(Enum(DecisionType, name="decision_type"))
    note: Mapped[str | None] = mapped_column(Text)

    recommendation = relationship("Recommendation", back_populates="decisions")


class ImpactBaseline(TimestampMixin, Base):
    """Frozen snapshot at decision time so 'before vs after' is honest."""

    __tablename__ = "impact_baselines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recommendation_id: Mapped[int] = mapped_column(ForeignKey("recommendations.id"), unique=True)
    geo_id: Mapped[int] = mapped_column(ForeignKey("geographic_entities.id"))
    category_code: Mapped[str] = mapped_column(ForeignKey("categories.code"))
    snapshot: Mapped[dict] = mapped_column(JSON)  # unique_citizens, per_100k, avg_urgency, infra_index, cluster_count
    snapshot_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
