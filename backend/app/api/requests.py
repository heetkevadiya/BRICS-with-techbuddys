from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import User, current_user, require_role
from app.core.config import settings
from app.db.session import SessionLocal, get_db
from app.models import Category, Channel, CitizenRequest, GeographicEntity, GeoLevel, ProcessingStatus
from app.schemas.request import RequestAck, RequestCreate, RequestListOut, RequestOut, TrackOut, VerifyIn
from app.services import pipeline_service, translation_service, verification_service
from app.utils.hashing import citizen_hash, new_tracking_code

router = APIRouter(prefix="/requests", tags=["citizen requests"])
AUDIO_DIR = Path(__file__).resolve().parents[2] / "data" / "raw" / "audio"

ACK = {
    "en": "Thank you. Your request has been received and is being analysed. Track it with code {code}.",
    "hi": "धन्यवाद। आपका अनुरोध प्राप्त हो गया है और उसका विश्लेषण किया जा रहा है। कोड {code} से ट्रैक करें।",
    "gu": "આભાર. તમારી વિનંતી મળી ગઈ છે અને તેનું વિશ્લેષણ થઈ રહ્યું છે. કોડ {code} થી ટ્રૅક કરો.",
    "hi-Latn": "Dhanyavaad. Aapka anurodh mil gaya hai aur uska vishleshan ho raha hai. Code {code} se track karein.",
}


def _ack(lang: str | None, code: str) -> str:
    return ACK.get(lang or "en", ACK["en"]).format(code=code)


def _district(db: Session, name: str | None) -> GeographicEntity | None:
    if not name:
        return None
    return db.query(GeographicEntity).filter_by(level=GeoLevel.DISTRICT, name=name).first()


def _run_pipeline(request_id: int) -> None:
    with SessionLocal() as db:
        pipeline_service.process_request(db, request_id)


@router.post("", response_model=RequestAck, status_code=202)
def submit_text(body: RequestCreate, bg: BackgroundTasks, db: Session = Depends(get_db)):
    geo = _district(db, body.district)
    req = CitizenRequest(
        tracking_code=new_tracking_code(), channel=body.channel, original_text=body.text, declared_language=body.language,
        citizen_hash=citizen_hash(body.citizen_ref), submitted_lat=body.lat, submitted_lng=body.lng,
        submitted_geo_id=geo.id if geo else None, submitted_at=datetime.now(timezone.utc),
    )
    db.add(req)
    db.commit()
    bg.add_task(_run_pipeline, req.id)
    return RequestAck(id=req.id, tracking_code=req.tracking_code, status=req.processing_status, message=_ack(body.language, req.tracking_code))


@router.post("/voice", response_model=RequestAck, status_code=202)
async def submit_voice(bg: BackgroundTasks, audio: UploadFile = File(...), language: str | None = Form(None),
                       district: str | None = Form(None), citizen_ref: str | None = Form(None),
                       lat: float | None = Form(None), lng: float | None = Form(None), db: Session = Depends(get_db)):
    data = await audio.read()
    if not data or len(data) > 15 * 1024 * 1024:
        raise HTTPException(400, "audio missing or larger than 15 MB")
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    ext = (audio.filename or "a.webm").rsplit(".", 1)[-1][:5]
    path = AUDIO_DIR / f"{uuid.uuid4().hex}.{ext}"
    path.write_bytes(data)
    geo = _district(db, district)
    req = CitizenRequest(
        tracking_code=new_tracking_code(), channel=Channel.VOICE, audio_path=str(path), audio_mime=audio.content_type or "audio/webm",
        declared_language=language, citizen_hash=citizen_hash(citizen_ref), submitted_lat=lat, submitted_lng=lng,
        submitted_geo_id=geo.id if geo else None, submitted_at=datetime.now(timezone.utc),
    )
    db.add(req)
    db.commit()
    bg.add_task(_run_pipeline, req.id)
    return RequestAck(id=req.id, tracking_code=req.tracking_code, status=req.processing_status, message=_ack(language, req.tracking_code))


@router.get("", response_model=RequestListOut)
def list_requests(db: Session = Depends(get_db), user: User = Depends(require_role("analyst", "policymaker")),
                  district: str | None = None, category: str | None = None, status: ProcessingStatus | None = None,
                  language: str | None = None, q: str | None = None, page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=200)):
    query = db.query(CitizenRequest)
    if district:
        g = _district(db, district)
        query = query.filter(CitizenRequest.resolved_geo_id == (g.id if g else -1))
    if category:
        query = query.filter(CitizenRequest.category_code == category)
    if status:
        query = query.filter(CitizenRequest.processing_status == status)
    if language:
        query = query.filter(CitizenRequest.detected_language == language)
    if q:
        like = f"%{q}%"
        query = query.filter(CitizenRequest.original_text.ilike(like) | CitizenRequest.translated_text.ilike(like) | CitizenRequest.transcript.ilike(like))
    total = query.count()
    items = query.order_by(CitizenRequest.submitted_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return RequestListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/track/{tracking_code}", response_model=TrackOut)
def track(tracking_code: str, db: Session = Depends(get_db)):
    req = db.query(CitizenRequest).filter_by(tracking_code=tracking_code.upper()).first()
    if not req:
        raise HTTPException(404, "unknown tracking code")
    lang = req.declared_language or req.detected_language or "en"
    cat = db.get(Category, req.category_code) if req.category_code else None
    cat_name = (cat.names_local.get(lang[:2]) or cat.name) if cat else None
    if req.processing_status in (ProcessingStatus.RECEIVED, ProcessingStatus.PROCESSING):
        msg = {"gu": "તમારી વિનંતી પર કામ ચાલુ છે.", "hi": "आपके अनुरोध पर काम चल रहा है।"}.get(lang[:2], "Your request is being analysed.")
    elif req.processing_status == ProcessingStatus.FAILED:
        msg = {"gu": "તકનીકી ખામી; અમે ફરી પ્રયાસ કરીશું.", "hi": "तकनीकी समस्या; हम पुनः प्रयास करेंगे।"}.get(lang[:2], "A technical issue occurred; we will retry.")
    else:
        base = f"Your request was understood as '{cat.name if cat else 'general'}' in {req.resolved_geo.name if req.resolved_geo else 'your area'} and is part of the district analysis shared with policymakers."
        try:
            msg = translation_service.translate(base, lang) if lang[:2] != "en" else base
        except Exception:
            msg = base
    return TrackOut(tracking_code=req.tracking_code, status=req.processing_status, language=req.detected_language, category=cat_name,
                    district=req.resolved_geo.name if req.resolved_geo else None, message=msg, submitted_at=req.submitted_at)


@router.get("/{request_id}", response_model=RequestOut)
def get_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("analyst", "policymaker"))):
    req = db.get(CitizenRequest, request_id)
    if not req:
        raise HTTPException(404, "not found")
    return req


@router.post("/{request_id}/verify", response_model=RequestOut)
def verify(request_id: int, body: VerifyIn, db: Session = Depends(get_db), user: User = Depends(require_role("analyst"))):
    req = db.get(CitizenRequest, request_id)
    if not req:
        raise HTTPException(404, "not found")
    try:
        verification_service.apply(db, req, analyst_id=user.uid, action=body.action, corrections=body.corrections, reason=body.reason)
    except ValueError as e:
        raise HTTPException(400, str(e))
    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/reprocess", response_model=RequestAck, status_code=202)
def reprocess(request_id: int, bg: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(require_role("analyst"))):
    req = db.get(CitizenRequest, request_id)
    if not req:
        raise HTTPException(404, "not found")
    bg.add_task(_run_pipeline, req.id)
    return RequestAck(id=req.id, tracking_code=req.tracking_code, status=ProcessingStatus.PROCESSING, message="re-queued")
