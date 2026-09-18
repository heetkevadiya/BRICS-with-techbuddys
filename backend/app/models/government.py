"""World B: authoritative government / external datasets. Every row carries provenance."""
from __future__ import annotations

import enum
from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class DatasetStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    STALE = "STALE"
    SUPERSEDED = "SUPERSEDED"
    FAILED = "FAILED"


class DatasetMetadata(TimestampMixin, Base):
    """Answers 'where did this number come from?' for every external dataset."""

    __tablename__ = "dataset_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dataset_name: Mapped[str] = mapped_column(String(120), nullable=False)
    source: Mapped[str] = mapped_column(String(200), nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(400))
    department: Mapped[str | None] = mapped_column(String(160))
    version: Mapped[str] = mapped_column(String(40), default="1")
    data_date: Mapped[date | None] = mapped_column(Date)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_frequency: Mapped[str | None] = mapped_column(String(40))
    license: Mapped[str | None] = mapped_column(String(120))
    is_synthetic: Mapped[bool] = mapped_column(default=False)  # demo data must be labelled honestly
    notes: Mapped[str | None] = mapped_column(Text)
    row_count: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[DatasetStatus] = mapped_column(Enum(DatasetStatus, name="dataset_status"), default=DatasetStatus.ACTIVE)


class ProvenanceMixin:
    dataset_id: Mapped[int | None] = mapped_column(ForeignKey("dataset_metadata.id"))
    data_date: Mapped[date | None] = mapped_column(Date)


class Demographics(ProvenanceMixin, Base):
    __tablename__ = "demographics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    geo_id: Mapped[int] = mapped_column(ForeignKey("geographic_entities.id"), index=True)
    population: Mapped[int] = mapped_column(Integer, nullable=False)
    population_density: Mapped[float | None] = mapped_column(Float)
    literacy_rate: Mapped[float | None] = mapped_column(Float)
    urban_population_pct: Mapped[float | None] = mapped_column(Float)
    rural_population_pct: Mapped[float | None] = mapped_column(Float)
    children_pct: Mapped[float | None] = mapped_column(Float)
    elderly_pct: Mapped[float | None] = mapped_column(Float)
    mobile_penetration_pct: Mapped[float | None] = mapped_column(Float)  # used for connectivity adjustment

    geo = relationship("GeographicEntity")


class InfrastructureIndex(ProvenanceMixin, Base):
    """0–100 indices; higher = better. Category.infra_index_field names one of these columns."""

    __tablename__ = "infrastructure_indices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    geo_id: Mapped[int] = mapped_column(ForeignKey("geographic_entities.id"), index=True)
    road_index: Mapped[float | None] = mapped_column(Float)
    water_index: Mapped[float | None] = mapped_column(Float)
    sanitation_index: Mapped[float | None] = mapped_column(Float)
    waste_index: Mapped[float | None] = mapped_column(Float)
    electricity_index: Mapped[float | None] = mapped_column(Float)
    lighting_safety_index: Mapped[float | None] = mapped_column(Float)
    healthcare_index: Mapped[float | None] = mapped_column(Float)
    education_index: Mapped[float | None] = mapped_column(Float)
    housing_index: Mapped[float | None] = mapped_column(Float)
    environment_index: Mapped[float | None] = mapped_column(Float)
    disaster_resilience_index: Mapped[float | None] = mapped_column(Float)
    irrigation_index: Mapped[float | None] = mapped_column(Float)
    connectivity_index: Mapped[float | None] = mapped_column(Float)
    welfare_access_index: Mapped[float | None] = mapped_column(Float)
    employment_index: Mapped[float | None] = mapped_column(Float)
    public_space_index: Mapped[float | None] = mapped_column(Float)
    overall_index: Mapped[float | None] = mapped_column(Float)

    geo = relationship("GeographicEntity")


class ProjectStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    APPROVED = "APPROVED"
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    STALLED = "STALLED"


class GovernmentProject(ProvenanceMixin, Base):
    __tablename__ = "government_projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category_code: Mapped[str] = mapped_column(ForeignKey("categories.code"), index=True)
    geo_id: Mapped[int] = mapped_column(ForeignKey("geographic_entities.id"), index=True)
    department: Mapped[str | None] = mapped_column(String(160))
    budget_inr: Mapped[float | None] = mapped_column(Float)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, name="project_status"))
    planned_year: Mapped[int | None] = mapped_column(Integer)
    start_date: Mapped[date | None] = mapped_column(Date)
    expected_completion: Mapped[date | None] = mapped_column(Date)
    actual_completion: Mapped[date | None] = mapped_column(Date)
    scheme: Mapped[str | None] = mapped_column(String(160))  # e.g. PMGSY, Jal Jeevan Mission

    geo = relationship("GeographicEntity")


class InvestmentPlan(ProvenanceMixin, Base):
    __tablename__ = "investment_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    geo_id: Mapped[int] = mapped_column(ForeignKey("geographic_entities.id"), index=True)
    category_code: Mapped[str] = mapped_column(ForeignKey("categories.code"), index=True)
    fiscal_year: Mapped[str] = mapped_column(String(9))  # "2026-27"
    allocated_inr: Mapped[float] = mapped_column(Float, default=0)
    planned_inr: Mapped[float] = mapped_column(Float, default=0)
    spent_inr: Mapped[float] = mapped_column(Float, default=0)

    geo = relationship("GeographicEntity")


class NationalPriority(ProvenanceMixin, Base):
    """What makes 'policy alignment' a computed number rather than an opinion."""

    __tablename__ = "national_priorities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    country_code: Mapped[str] = mapped_column(String(2), default="IN")
    programme: Mapped[str] = mapped_column(String(160), nullable=False)  # e.g. "Jal Jeevan Mission"
    category_code: Mapped[str] = mapped_column(ForeignKey("categories.code"), index=True)
    is_priority_sector: Mapped[bool] = mapped_column(default=True)
    target_geo_ids: Mapped[list] = mapped_column(JSON, default=list)  # empty = nationwide
    quantified_target: Mapped[str | None] = mapped_column(String(300))
    sdg: Mapped[list] = mapped_column(JSON, default=list)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
