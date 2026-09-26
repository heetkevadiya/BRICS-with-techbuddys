from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from sqlalchemy import func

from app.analytics.aggregation import VALID_STATUSES
from app.core.config import settings
from app.db.session import get_db
from app.models import Category, CitizenRequest, Demographics, GeographicEntity, GeoLevel, ProcessingStatus
from app.services.priority_service import weights

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/categories")
def categories(db: Session = Depends(get_db), lang: str = "en"):
    return [{"code": c.code, "name": c.name, "label": c.names_local.get(lang, c.name), "names_local": c.names_local,
             "sub_categories": c.sub_categories, "department": c.department, "sdg": c.sdg}
            for c in db.query(Category).filter_by(is_active=True).order_by(Category.sort_order)]


@router.get("/states")
def states(db: Session = Depends(get_db)):
    out = []
    for s in db.query(GeographicEntity).filter_by(level=GeoLevel.STATE).order_by(GeographicEntity.name):
        districts = db.query(GeographicEntity).filter_by(parent_id=s.id, level=GeoLevel.DISTRICT).order_by(GeographicEntity.name).all()
        out.append({"id": s.id, "name": s.name, "code": s.code, "is_default": s.name == settings.default_state,
                    "districts": [{"id": d.id, "name": d.name, "code": d.code, "lat": d.centroid_lat, "lng": d.centroid_lng} for d in districts]})
    return out


@router.get("/showcase")
def showcase(db: Session = Depends(get_db)):
    """One real processed request per language, with what Gemini extracted from it."""
    out = []
    for lang in ("gu", "hi", "hi-Latn", "en"):
        r = (db.query(CitizenRequest)
             .filter(CitizenRequest.declared_language == lang,
                     CitizenRequest.processing_status == ProcessingStatus.PROCESSED,
                     CitizenRequest.translated_text.isnot(None),
                     CitizenRequest.category_code.isnot(None),
                     CitizenRequest.resolved_geo_id.isnot(None))
             .order_by(CitizenRequest.ai_confidence.desc(), CitizenRequest.id)
             .first())
        if r is None:
            continue
        out.append({
            "language": lang,
            "channel": r.channel.value,
            "original_text": r.original_text,
            "translated_text": r.translated_text,
            "category": r.category.name if r.category else None,
            "sub_category": r.sub_category,
            "district": r.resolved_geo.name if r.resolved_geo else None,
            "urgency": r.urgency_score,
            "confidence": round(r.ai_confidence, 2) if r.ai_confidence is not None else None,
        })
    return out


@router.get("/priority-weights")
def priority_weights():
    return weights()


@router.get("/languages")
def languages():
    return {"tier1": ["gu", "hi", "en", "hi-Latn"], "tier2": ["mr", "bn", "ta", "te", "kn", "ml", "pa", "or", "ur", "as"],
            "labels": {"gu": "ગુજરાતી", "hi": "हिन्दी", "en": "English", "hi-Latn": "Hinglish", "mr": "मराठी", "bn": "বাংলা", "ta": "தமிழ்",
                       "te": "తెలుగు", "kn": "ಕನ್ನಡ", "ml": "മലയാളം", "pa": "ਪੰਜਾਬੀ", "or": "ଓଡ଼ିଆ", "ur": "اردو", "as": "অসমীয়া"}}


@router.get("/coverage")
def coverage(db: Session = Depends(get_db)):
    """Headline scale, for the public landing page. Aggregates only — no citizen data."""
    valid = db.query(CitizenRequest).filter(
        CitizenRequest.processing_status.in_(VALID_STATUSES), CitizenRequest.is_flagged.is_(False))
    langs = dict(valid.with_entities(CitizenRequest.detected_language, func.count())
                 .group_by(CitizenRequest.detected_language).order_by(func.count().desc()).all())
    return {
        "national": {
            "states": db.query(GeographicEntity).filter_by(level=GeoLevel.STATE).count(),
            "districts": db.query(GeographicEntity).filter_by(level=GeoLevel.DISTRICT).count(),
            "population": int(db.query(func.sum(Demographics.population)).scalar() or 0),
        },
        "total_requests": valid.count(),
        "unique_citizens": valid.with_entities(
            func.count(func.distinct(func.coalesce(
                CitizenRequest.citizen_hash, func.cast(CitizenRequest.id, __import__("sqlalchemy").String))))).scalar() or 0,
        "languages": {k or "unknown": v for k, v in langs.items()},
        "pilot_state": settings.default_state,
    }
