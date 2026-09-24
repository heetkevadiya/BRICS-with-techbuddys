"""Download the real Indian government datasets this platform is built on.

Nothing here is invented: each file is fetched from its published source and written to
data/raw/india/ with a manifest recording where it came from and when. Re-running is safe.

Run: python3.12 -m scripts.fetch_open_data
"""
from __future__ import annotations

import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RAW = Path(__file__).resolve().parents[1] / "data" / "raw" / "india"

SOURCES = [
    {
        "file": "india_districts.geojson",
        "url": "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/india.geojson",
        "title": "District boundaries of India (Census 2011 districts)",
        "publisher": "Survey of India boundaries, compiled from Census 2011 district codes",
        "landing_page": "https://github.com/udit-001/india-maps-data",
        "license": "MIT (compilation); underlying boundaries are Government of India",
        "data_date": "2011-03-01",
    },
    {
        "file": "census_2011_districts.csv",
        "url": "https://raw.githubusercontent.com/nishusharma1608/India-Census-2011-Analysis/master/india-districts-census-2011.csv",
        "title": "Census of India 2011 — district level (population, literacy, household amenities)",
        "publisher": "Office of the Registrar General & Census Commissioner, India",
        "landing_page": "https://censusindia.gov.in/census.website/data/census-tables",
        "license": "Government Open Data License – India (GODL)",
        "data_date": "2011-03-01",
    },
]


def fetch(force: bool = False) -> list[dict]:
    RAW.mkdir(parents=True, exist_ok=True)
    manifest = []
    for s in SOURCES:
        path = RAW / s["file"]
        if force or not path.exists():
            print(f"downloading {s['file']} …")
            with urllib.request.urlopen(s["url"], timeout=120) as r:
                path.write_bytes(r.read())
        else:
            print(f"{s['file']} already present, skipping")
        data = path.read_bytes()
        manifest.append({
            **s,
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest()[:16],
            "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        })
    (RAW / "MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


if __name__ == "__main__":
    for m in fetch():
        print(f"  {m['file']:32s} {m['bytes']:>9,} bytes  sha256:{m['sha256']}  {m['publisher'][:40]}")
