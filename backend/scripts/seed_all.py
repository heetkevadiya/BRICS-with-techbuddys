"""One command to rebuild the demo database: migrations → government data → synthetic requests → recommendations.
Run: python -m scripts.seed_all [--n 20000] [--explain 10]
"""
from __future__ import annotations

import argparse
import subprocess
import sys

from sqlalchemy import text

from app.db.session import SessionLocal
from app.models import GeographicEntity, GeoLevel
from app.services.recommendation_service import recompute
from scripts import generate_synthetic_requests

ap = argparse.ArgumentParser()
ap.add_argument("--n", type=int, default=20000)
ap.add_argument("--explain", type=int, default=10, help="how many top recommendations get a Gemini explanation")
args = ap.parse_args()

subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)
subprocess.run([sys.executable, "-m", "scripts.generate_seed_datasets"], check=True)
subprocess.run([sys.executable, "-m", "scripts.seed_government_data"], check=True)
with SessionLocal() as db:
    db.execute(text("truncate citizen_requests, request_clusters, verifications, recommendations, decisions, impact_baselines restart identity cascade"))
    db.commit()
generate_synthetic_requests.main(args.n)
with SessionLocal() as db:
    state = db.query(GeographicEntity).filter_by(level=GeoLevel.STATE, name="Gujarat").one()
    print("recommendations:", len(recompute(db, state.id, explain_top_n=args.explain)))
