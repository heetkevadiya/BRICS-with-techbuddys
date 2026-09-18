"""A citizen request. The original input is immutable; every AI-derived field is separate and reviewable."""
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Channel(str, enum.Enum):
    WEB = "WEB"
    VOICE = "VOICE"
    WHATSAPP = "WHATSAPP"
    SMS = "SMS"
    IVR = "IVR"
    OFFICE = "OFFICE"


class ProcessingStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    FAILED = "FAILED"
    LANGUAGE_UNSUPPORTED = "LANGUAGE_UNSUPPORTED"


class VerificationStatus(str, enum.Enum):
    UNVERIFIED = "UNVERIFIED"
    APPROVED = "APPROVED"
    CORRECTED = "CORRECTED"
    REJECTED = "REJECTED"


class CitizenRequest(TimestampMixin, Base):
    __tablename__ = "citizen_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tracking_code: Mapped[str] = mapped_column(String(12), unique=True, index=True)

    # ---- original citizen input (never modified) ----
    channel: Mapped[Channel] = mapped_column(Enum(Channel, name="channel"), nullable=False)
    original_text: Mapped[str | None] = mapped_column(Text)
    audio_path: Mapped[str | None] = mapped_column(String(300))
    audio_mime: Mapped[str | None] = mapped_column(String(60))
    declared_language: Mapped[str | None] = mapped_column(String(8))
    citizen_hash: Mapped[str | None] = mapped_column(String(64), index=True)  # hashed phone/session, never raw PII
    submitted_lat: Mapped[float | None] = mapped_column(Float)
    submitted_lng: Mapped[float | None] = mapped_column(Float)
    submitted_geo_id: Mapped[int | None] = mapped_column(ForeignKey("geographic_entities.id"))
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # ---- AI-derived (reviewable) ----
    transcript: Mapped[str | None] = mapped_column(Text)
    detected_language: Mapped[str | None] = mapped_column(String(8))
    translated_text: Mapped[str | None] = mapped_column(Text)
    category_code: Mapped[str | None] = mapped_column(ForeignKey("categories.code"), index=True)
    secondary_category_code: Mapped[str | None] = mapped_column(String(32))
    sub_category: Mapped[str | None] = mapped_column(String(80))
    problem_description: Mapped[str | None] = mapped_column(Text)
    urgency_score: Mapped[int | None] = mapped_column(Integer)  # 1–10
    location_mention: Mapped[str | None] = mapped_column(String(200))
    resolved_geo_id: Mapped[int | None] = mapped_column(ForeignKey("geographic_entities.id"), index=True)
    entities: Mapped[list] = mapped_column(JSON, default=list)
    affected_population_estimate: Mapped[int | None] = mapped_column(Integer)
    ai_confidence: Mapped[float | None] = mapped_column(Float)
    ai_raw: Mapped[dict | None] = mapped_column(JSON)
    ai_model: Mapped[str | None] = mapped_column(String(60))
    embedding: Mapped[list[float] | None] = mapped_column(ARRAY(Float))

    # ---- clustering / duplicates ----
    cluster_id: Mapped[int | None] = mapped_column(ForeignKey("request_clusters.id"), index=True)
    duplicate_of_id: Mapped[int | None] = mapped_column(ForeignKey("citizen_requests.id"))
    spam_score: Mapped[float] = mapped_column(Float, default=0.0)
    is_flagged: Mapped[bool] = mapped_column(default=False)

    # ---- status ----
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        Enum(ProcessingStatus, name="processing_status"), default=ProcessingStatus.RECEIVED, index=True
    )
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status"), default=VerificationStatus.UNVERIFIED, index=True
    )
    processing_error: Mapped[str | None] = mapped_column(Text)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    resolved_geo = relationship("GeographicEntity", foreign_keys=[resolved_geo_id])
    submitted_geo = relationship("GeographicEntity", foreign_keys=[submitted_geo_id])
    category = relationship("Category")
    cluster = relationship("RequestCluster", back_populates="requests")
    verifications = relationship("Verification", back_populates="request")

    @property
    def effective_text(self) -> str:
        return self.original_text or self.transcript or ""
