from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models import Channel, ProcessingStatus, VerificationAction, VerificationStatus


class RequestCreate(BaseModel):
    text: str = Field(min_length=3, max_length=4000)
    language: str | None = Field(None, description="Declared language code, e.g. gu, hi, en; optional")
    channel: Channel = Channel.WEB
    district: str | None = None
    lat: float | None = Field(None, ge=-90, le=90)
    lng: float | None = Field(None, ge=-180, le=180)
    citizen_ref: str | None = Field(None, description="Phone/session id; hashed before storage, never stored raw")


class RequestAck(BaseModel):
    id: int
    tracking_code: str
    status: ProcessingStatus
    message: str


class GeoOut(BaseModel):
    id: int
    name: str
    level: str

    model_config = {"from_attributes": True}


class RequestOut(BaseModel):
    id: int
    tracking_code: str
    channel: Channel
    original_text: str | None
    transcript: str | None
    declared_language: str | None
    detected_language: str | None
    translated_text: str | None
    category_code: str | None
    secondary_category_code: str | None
    sub_category: str | None
    problem_description: str | None
    urgency_score: int | None
    location_mention: str | None
    resolved_geo: GeoOut | None
    entities: list
    affected_population_estimate: int | None
    ai_confidence: float | None
    ai_model: str | None
    cluster_id: int | None
    duplicate_of_id: int | None
    is_flagged: bool
    processing_status: ProcessingStatus
    verification_status: VerificationStatus
    processing_error: str | None
    submitted_at: datetime
    processed_at: datetime | None

    model_config = {"from_attributes": True}


class RequestListOut(BaseModel):
    items: list[RequestOut]
    total: int
    page: int
    page_size: int


class TrackOut(BaseModel):
    tracking_code: str
    status: ProcessingStatus
    language: str | None
    category: str | None
    district: str | None
    message: str
    submitted_at: datetime


class VerifyIn(BaseModel):
    action: VerificationAction
    corrections: dict | None = None
    reason: str | None = None
