"""Connector for data.gov.in — the Government of India's official Open Government Data platform.

The platform never queries data.gov.in while serving a dashboard. Datasets are fetched once,
written to data/raw/india/datagov/ with their provenance, and everything downstream reads the
cached copy. That is the ingestion architecture the blueprint calls for, and it also means a
rate-limited or offline API can never take the demo down.

The default key is the public sample key data.gov.in publishes in its own API documentation. It is
shared and aggressively rate-limited; register a free personal key at https://data.gov.in/apis and
set DATAGOV_API_KEY for real throughput.
"""
from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

log = logging.getLogger(__name__)

CACHE = Path(__file__).resolve().parents[2] / "data" / "raw" / "india" / "datagov"
BASE = "https://api.data.gov.in/resource"
PUBLIC_SAMPLE_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"
PAGE = 100  # the shared sample key times out on large pages; these datasets are small anyway


# The datasets this platform ingests. Each is a published resource on data.gov.in.
RESOURCES = {
    "health_infrastructure": {
        "resource_id": "ff70glv617m5ea2glhifwxomhwvnt2ey",
        "title": "Health infrastructure — sub-centres, PHCs and CHCs by State/UT",
        "publisher": "Ministry of Health and Family Welfare",
        "level": "state",
        "data_date": "2015-03-31",
    },
    "pmgsy_district_roads": {
        "resource_id": "cfec1f88-f122-4bf9-bc52-b430ade876ea",
        "title": "District-wise road length completed under PMGSY",
        "publisher": "Ministry of Rural Development (National Rural Infrastructure Development Agency)",
        "level": "district",
        "data_date": "2018-03-31",
    },
    "pmgsy_state_targets": {
        "resource_id": "793a70f3-b0d7-4de2-844a-d3dd36dee3ae",
        "title": "State-wise outcome targets and achievement under PMGSY",
        "publisher": "Ministry of Rural Development",
        "level": "state",
        "data_date": "2018-03-31",
    },
}


def api_key() -> str:
    return os.environ.get("DATAGOV_API_KEY") or PUBLIC_SAMPLE_KEY


def using_shared_key() -> bool:
    return api_key() == PUBLIC_SAMPLE_KEY


def fetch_resource(resource_id: str, *, name: str, refresh: bool = False,
                   max_records: int = 5000, retries: int = 4) -> dict:
    """Return {'records': [...], 'provenance': {...}}, from cache unless refresh is asked for.

    Backs off on 429, which the shared sample key hits often.
    """
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{name}.json"
    if path.exists() and not refresh:
        return json.loads(path.read_text())

    records: list[dict] = []
    offset, total = 0, None
    while offset < max_records:
        url = (f"{BASE}/{resource_id}?api-key={api_key()}&format=json"
               f"&limit={min(PAGE, max_records - offset)}&offset={offset}")
        page = _get_with_backoff(url, retries)
        if page is None:
            break
        total = page.get("total", total)
        batch = page.get("records") or []
        records.extend(batch)
        if len(batch) < PAGE or (total is not None and len(records) >= int(total)):
            break
        offset += PAGE

    if not records:
        raise RuntimeError(
            f"data.gov.in returned no records for {name} ({resource_id}). "
            f"{'The shared sample key is rate-limited — set DATAGOV_API_KEY.' if using_shared_key() else ''}"
        )

    payload = {
        "records": records,
        "provenance": {
            "resource_id": resource_id,
            "name": name,
            "source": "data.gov.in — Open Government Data (OGD) Platform India",
            "source_url": f"https://www.data.gov.in/resource/{resource_id}",
            "api_url": f"{BASE}/{resource_id}",
            "license": "Government Open Data License – India (GODL)",
            "records_returned": len(records),
            "records_reported": total,
            "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "shared_sample_key": using_shared_key(),
        },
    }
    path.write_text(json.dumps(payload, indent=1))
    log.info("data.gov.in: cached %s records for %s", len(records), name)
    return payload


def _get_with_backoff(url: str, retries: int) -> dict | None:
    delay = 2.0
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == retries - 1:
                log.warning("data.gov.in HTTP %s for %s", e.code, url.split("?")[0])
                return None
            time.sleep(delay)
            delay *= 2  # the shared key needs real room between attempts
        except Exception as e:
            log.warning("data.gov.in request failed: %s", e)
            return None
    return None


def cached() -> list[dict]:
    """Provenance of everything already downloaded, for the dataset registry."""
    if not CACHE.exists():
        return []
    return [json.loads(p.read_text())["provenance"] for p in sorted(CACHE.glob("*.json"))]
