"""Seed the Firestore live feed with the most recent processed reports.

The pipeline publishes every new request as it is processed, so this only has to run once to give
the dashboard something to show before the first live submission. Safe to re-run.

Run: python -m scripts.sync_firestore [--limit 50]
"""
from __future__ import annotations

import argparse

from app.db.session import SessionLocal
from app.models import CitizenRequest, ProcessingStatus
from app.services import firestore_service as fs

ap = argparse.ArgumentParser()
ap.add_argument("--limit", type=int, default=fs.KEEP)
limit = ap.parse_args().limit

status = fs.status()
if not status["live"]:
    raise SystemExit(f"Firestore is not reachable: {status['reason']}")

with SessionLocal() as db:
    rows = (db.query(CitizenRequest)
            .filter(CitizenRequest.processing_status.in_([ProcessingStatus.PROCESSED,
                                                         ProcessingStatus.REVIEW_REQUIRED]),
                    CitizenRequest.resolved_geo_id.isnot(None))
            .order_by(CitizenRequest.submitted_at.desc())
            .limit(limit).all())
    published = sum(fs.publish(r) for r in rows)

removed = fs.prune(limit)
print(f"published {published} of {len(rows)} reports to '{fs.COLLECTION}' · pruned {removed} older documents")
