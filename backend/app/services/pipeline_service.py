"""The request-processing pipeline (blueprint §12):
validate → STT → detect/translate/extract (Gemini) → schema validation → business rules → geo resolution →
embedding → cluster/duplicate → confidence check → status. The citizen's original input is never modified."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import CitizenRequest, ProcessingStatus
from app.services import clustering_service, extraction_service, speech_service
from app.services.ai import gemini_client
from app.utils.geo import GeoResolver

log = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.60
TIER1 = {"gu", "hi", "en", "hi-Latn"}
TIER2 = {"mr", "bn", "ta", "te", "kn", "ml", "pa", "or", "ur", "as"}


def process_request(db: Session, request_id: int) -> CitizenRequest:
    req = db.get(CitizenRequest, request_id)
    if req is None:
        raise ValueError(f"request {request_id} not found")
    req.processing_status = ProcessingStatus.PROCESSING
    req.processing_error = None
    db.commit()
    try:
        _run(db, req)
    except Exception as e:  # keep the raw request safe; it can be retried
        log.exception("pipeline failed for request %s", request_id)
        req.processing_status = ProcessingStatus.FAILED
        req.processing_error = str(e)[:2000]
    req.processed_at = datetime.now(timezone.utc)
    db.commit()
    return req


def _run(db: Session, req: CitizenRequest) -> None:
    resolver = GeoResolver(db, settings.default_country)
    known_district = req.submitted_geo.name if req.submitted_geo is not None else None

    audio_bytes: bytes | None = None
    if req.audio_path and not req.original_text:
        audio_bytes = Path(req.audio_path).read_bytes()
        if speech_service.cloud_stt_available():
            transcript, lang = speech_service.transcribe_with_cloud_stt(audio_bytes, req.audio_mime or "audio/webm", req.declared_language)
            req.transcript, req.detected_language = transcript, lang
            audio_bytes = None  # already have text; extraction runs on the transcript

    text = req.original_text or req.transcript
    result = extraction_service.extract(
        db, text=text, audio=audio_bytes, audio_mime=req.audio_mime,
        declared_language=req.declared_language, known_district=known_district,
    )

    # ---- copy AI fields (original input untouched) ----
    if result.transcript and not req.transcript:
        req.transcript = result.transcript
    req.detected_language = req.detected_language or result.detected_language
    req.translated_text = result.translated_text
    req.category_code = result.category_code
    req.secondary_category_code = result.secondary_category_code
    req.sub_category = result.sub_category
    req.problem_description = result.problem_description
    req.urgency_score = result.urgency_score
    req.location_mention = ", ".join(x for x in (result.location.locality, result.location.district) if x) or None
    req.entities = result.entities
    req.affected_population_estimate = result.affected_population_estimate
    req.ai_confidence = result.confidence
    req.ai_raw = result.model_dump()
    req.ai_model = gemini_client.model_name()
    req.spam_score = 0.9 if result.is_spam_or_irrelevant else 0.0
    req.is_flagged = result.is_spam_or_irrelevant

    # ---- geography: form > AI district > any district named in the text ----
    geo = req.submitted_geo or resolver.resolve(result.location.district) or resolver.resolve_in_text(text or result.translated_text)
    req.resolved_geo_id = geo.id if geo else None

    # ---- embedding + clustering (English problem statement, so language does not split clusters) ----
    embed_text = f"{result.category_code}: {result.problem_description}"
    req.embedding = gemini_client.embed([embed_text])[0]
    db.flush()
    if not req.is_flagged:
        clustering_service.assign_cluster(db, req)

    # ---- status ----
    lang = (req.detected_language or "").split("-")[0]
    review_reasons = []
    if result.confidence < CONFIDENCE_THRESHOLD:
        review_reasons.append(f"low confidence {result.confidence:.2f}")
    if req.resolved_geo_id is None:
        review_reasons.append("location unresolved")
    if req.category_code == "OTHER":
        review_reasons.append("category OTHER")
    if lang and lang not in TIER1 | TIER2 and req.detected_language not in TIER1:
        review_reasons.append(f"language {req.detected_language} outside supported tiers")
    if review_reasons:
        req.processing_status = ProcessingStatus.REVIEW_REQUIRED
        req.processing_error = "; ".join(review_reasons)
    else:
        req.processing_status = ProcessingStatus.PROCESSED
