"""Firestore carries the live feed: what citizens are reporting, right now.

PostgreSQL stays the system of record — it holds the 640-district geography, the PostGIS boundaries
and every number the priority formula reads. Firestore holds only a short rolling window of
already-processed reports, so the dashboards can update the moment one arrives instead of polling.

Nothing here may break intake. Every call is wrapped: if Firestore is unreachable, misconfigured or
unauthorised, the citizen's request still lands in PostgreSQL and the platform behaves exactly as it
does today.

Privacy: the feed carries no citizen text, no phone number and no citizen hash. It carries what a
public dashboard may show — district, category, urgency, language, channel and the timestamp.
"""
from __future__ import annotations

import logging
import time
from functools import lru_cache

from app.core.config import settings
from app.models import CitizenRequest

log = logging.getLogger(__name__)

COLLECTION = "live_feed"
KEEP = 50

_STATUS_TTL_SECONDS = 30.0
_status_cache: tuple[float, dict] | None = None


def configured() -> bool:
    return bool(settings.google_cloud_project and settings.credentials_path)


@lru_cache(maxsize=1)
def _client():
    from google.cloud import firestore

    return firestore.Client(project=settings.google_cloud_project)


def status() -> dict:
    global _status_cache
    if _status_cache and time.monotonic() - _status_cache[0] < _STATUS_TTL_SECONDS:
        return _status_cache[1]
    result = _probe()
    _status_cache = (time.monotonic(), result)
    return result


def _probe() -> dict:
    if not configured():
        return {"live": False, "collection": None,
                "reason": "No GOOGLE_CLOUD_PROJECT or service-account key configured."}
    try:
        next(_client().collection(COLLECTION).limit(1).stream(), None)
        return {"live": True, "collection": COLLECTION, "reason": None}
    except Exception as e:
        return {"live": False, "collection": COLLECTION, "reason": f"{type(e).__name__}: {str(e)[:200]}"}


def publish(req: CitizenRequest) -> bool:
    """Mirror one processed request onto the live feed. Never raises."""
    if not configured():
        return False
    try:
        doc = {
            "request_id": req.id,
            "district": req.resolved_geo.name if req.resolved_geo else None,
            "state": req.resolved_geo.parent.name if req.resolved_geo and req.resolved_geo.parent else None,
            "category_code": req.category_code,
            "sub_category": req.sub_category,
            "urgency": req.urgency_score,
            "language": req.detected_language,
            "channel": req.channel.value if req.channel else None,
            "status": req.processing_status.value,
            "confidence": round(req.ai_confidence, 2) if req.ai_confidence is not None else None,
            "submitted_at": req.submitted_at.isoformat() if req.submitted_at else None,
        }
        _client().collection(COLLECTION).document(str(req.id)).set(doc)
        return True
    except Exception as e:
        log.warning("live feed publish skipped for request %s: %s", req.id, e)
        return False


def prune(keep: int = KEEP) -> int:
    """Keep the feed short. Returns how many documents were removed."""
    if not configured():
        return 0
    try:
        from google.cloud import firestore

        docs = list(_client().collection(COLLECTION)
                    .order_by("submitted_at", direction=firestore.Query.DESCENDING)
                    .offset(keep).stream())
        for d in docs:
            d.reference.delete()
        return len(docs)
    except Exception as e:
        log.warning("live feed prune skipped: %s", e)
        return 0
