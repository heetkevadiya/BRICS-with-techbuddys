"""Download the data.gov.in datasets the platform uses, into the local cache.

Run: python -m scripts.fetch_datagov [--refresh]
"""
from __future__ import annotations

import argparse
import time

from app.ingestion.datagov import RESOURCES, fetch_resource, using_shared_key

ap = argparse.ArgumentParser()
ap.add_argument("--refresh", action="store_true", help="re-download even if cached")
args = ap.parse_args()

if using_shared_key():
    print("Using data.gov.in's public sample key — rate-limited. Set DATAGOV_API_KEY for a free personal key.\n")

for name, spec in RESOURCES.items():
    try:
        payload = fetch_resource(spec["resource_id"], name=name, refresh=args.refresh)
        p = payload["provenance"]
        print(f"  {name:26s} {p['records_returned']:>6} records   {spec['title'][:52]}")
    except Exception as e:
        print(f"  {name:26s} FAILED  {str(e)[:96]}")
    time.sleep(2)  # be a good citizen of a shared public API
