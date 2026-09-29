"""What the AI is actually doing, and how well.

Everything here is measured, not claimed: the accuracy figures come from a labelled evaluation set
committed to the repository, and the operational figures are counted live from the database.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.api.deps import User, require_role
from app.core.config import settings
from app.db.session import get_db
from app.models import CitizenRequest, ProcessingStatus, Verification, VerificationAction
from app.services import bigquery_service as bq
from app.services import speech_service
from app.services.ai import gemini_client

router = APIRouter(prefix="/ai", tags=["ai transparency"])
REPORT = Path(__file__).resolve().parents[2] / "data" / "eval" / "extraction_report.json"

# What each Google AI service does in this platform, and what it is deliberately NOT allowed to do.
PIPELINE = [
    {"step": "Language detection & translation", "service": "Gemini 2.5 Flash",
     "does": "Identifies the citizen's language, including code-mixed Hinglish, and produces a faithful English translation.",
     "never": "The original message is stored unchanged and shown beside every AI field."},
    {"step": "Speech-to-text", "service": "Cloud Speech-to-Text (Chirp)",
     "does": "Transcribes voice messages in Indian languages. Falls back to Gemini's native audio understanding.",
     "never": "Audio is kept so a failed transcription can be retried or done by a human."},
    {"step": "Structured extraction", "service": "Gemini 2.5 Flash, JSON schema mode",
     "does": "Category, sub-category, problem statement, urgency 1–10, location mention, entities, self-reported confidence.",
     "never": "Output is validated by Pydantic; anything below 0.60 confidence goes to an analyst."},
    {"step": "Clustering", "service": "Gemini Embedding",
     "does": "Groups differently-worded reports of the same issue by cosine similarity within a district and category.",
     "never": "Repeat reports from one citizen are linked, not counted twice."},
    {"step": "Priority score", "service": "None — deterministic Python",
     "does": "0.30 demand + 0.25 infrastructure gap + 0.20 population impact + 0.15 urgency + 0.10 policy alignment.",
     "never": "No model is involved. The same inputs always produce the same score."},
    {"step": "Explanation", "service": "Gemini 2.5 Flash",
     "does": "Writes a three-sentence briefing from the evidence dictionary.",
     "never": "It receives only the computed evidence and cannot change a single number."},
]


@router.get("/performance")
def performance(db: Session = Depends(get_db), user: User = Depends(require_role("analyst", "policymaker"))):
    total = db.query(CitizenRequest).count()
    processed = db.query(CitizenRequest).filter(CitizenRequest.ai_confidence.isnot(None))

    # Confidence distribution, in the bands the pipeline actually acts on: below 0.60 a request
    # is routed to an analyst, so the shape of this histogram is the human workload.
    band = case(
        (CitizenRequest.ai_confidence >= 0.85, "high"),
        (CitizenRequest.ai_confidence >= 0.70, "good"),
        (CitizenRequest.ai_confidence >= 0.60, "fair"),
        else_="review",
    )
    counts = dict(processed.with_entities(band, func.count()).group_by(band).all())
    bands = [
        {"band": "high", "label": "≥ 0.85 — accepted", "count": counts.get("high", 0)},
        {"band": "good", "label": "0.70–0.85 — accepted", "count": counts.get("good", 0)},
        {"band": "fair", "label": "0.60–0.70 — accepted", "count": counts.get("fair", 0)},
        {"band": "review", "label": "< 0.60 — sent to an analyst", "count": counts.get("review", 0)},
    ]

    by_lang = [
        {"language": lang or "unknown", "requests": n, "avg_confidence": round(float(c or 0), 3)}
        for lang, n, c in processed.with_entities(
            CitizenRequest.detected_language, func.count(), func.avg(CitizenRequest.ai_confidence)
        ).group_by(CitizenRequest.detected_language).order_by(func.count().desc()).all()
    ]

    reviewed = db.query(Verification).with_entities(Verification.action, func.count()).group_by(Verification.action).all()
    reviewed = {a.value: n for a, n in reviewed}
    corrections = db.query(Verification).filter(Verification.action == VerificationAction.CORRECT).count()
    decided = sum(reviewed.values())

    return {
        "model": settings.gemini_model,
        "embedding_model": settings.gemini_embedding_model,
        "thinking_budget": settings.gemini_thinking_budget,
        "pipeline": PIPELINE,
        "services": {
            "gemini": bool(settings.gemini_api_key),
            "cloud_speech_to_text": speech_service.cloud_stt_available(),
            "cloud_translation": settings.credentials_path is not None,
            "bigquery": bq.status()["live"],
        },
        "evaluation": json.loads(REPORT.read_text()) if REPORT.exists() else None,
        "operational": {
            "total_requests": total,
            "with_ai_output": processed.count(),
            "review_required": db.query(CitizenRequest).filter(
                CitizenRequest.processing_status == ProcessingStatus.REVIEW_REQUIRED).count(),
            "failed": db.query(CitizenRequest).filter(
                CitizenRequest.processing_status == ProcessingStatus.FAILED).count(),
            "avg_confidence": round(float(processed.with_entities(func.avg(CitizenRequest.ai_confidence)).scalar() or 0), 3),
            "confidence_bands": bands,
            "by_model": dict(db.query(CitizenRequest.ai_model, func.count())
                             .filter(CitizenRequest.ai_model.isnot(None))
                             .group_by(CitizenRequest.ai_model).all()),
            "by_language": by_lang,
            "analyst_decisions": reviewed,
            "correction_rate": round(corrections / decided, 3) if decided else None,
            "clusters": db.query(func.count(func.distinct(CitizenRequest.cluster_id))).scalar() or 0,
            "duplicates_linked": db.query(CitizenRequest).filter(CitizenRequest.duplicate_of_id.isnot(None)).count(),
        },
    }
