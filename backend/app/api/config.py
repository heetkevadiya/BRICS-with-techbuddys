from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import Category, GeographicEntity, GeoLevel
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


@router.get("/priority-weights")
def priority_weights():
    return weights()


@router.get("/languages")
def languages():
    return {"tier1": ["gu", "hi", "en", "hi-Latn"], "tier2": ["mr", "bn", "ta", "te", "kn", "ml", "pa", "or", "ur", "as"],
            "labels": {"gu": "ગુજરાતી", "hi": "हिन्दी", "en": "English", "hi-Latn": "Hinglish", "mr": "मराठी", "bn": "বাংলা", "ta": "தமிழ்",
                       "te": "తెలుగు", "kn": "ಕನ್ನಡ", "ml": "മലയാളം", "pa": "ਪੰਜਾਬੀ", "or": "ଓଡ଼ିଆ", "ur": "اردو", "as": "অসমীয়া"}}
