"""BigQuery is where the national datasets live at scale.

Postgres holds the operational, transactional world: incoming citizen requests, clusters, analyst
corrections, recommendations. That data changes constantly and is read one row at a time.

BigQuery holds the analytical world: 640 districts × 17 categories of census demographics, derived
infrastructure indices and budget lines, plus a daily snapshot of aggregated citizen demand. That is
what a national rollout queries across all 36 states at once, and what a ministry's own analysts
would join against their existing warehouse tables.

Everything degrades safely: `status()` reports what BigQuery can actually do right now — not what
the config file claims — so a dashboard can never advertise a layer that would fail on use, and the
platform runs entirely on Postgres when the warehouse is unreachable.
"""
from __future__ import annotations

import logging
import time
from functools import lru_cache

import pandas as pd

from app.core.config import settings

log = logging.getLogger(__name__)

TABLES = {
    "district_profile": "One row per district: census demographics and all 16 infrastructure indices.",
    "demand_snapshot": "One row per district × category: citizen demand joined to gap, budget and priority.",
}


def configured() -> bool:
    """Credentials and a project are present. Says nothing about whether they work."""
    return bool(settings.google_cloud_project and settings.credentials_path)


# A live round-trip costs ~1s, and two dashboard pages ask on every load. The answer changes only
# when someone runs a sync or edits IAM, so a short TTL is plenty and keeps the page responsive.
_STATUS_TTL_SECONDS = 30.0
_status_cache: tuple[float, dict] | None = None


def status() -> dict:
    """Actually reach BigQuery and report what it can do.

    `configured()` only proves a key file exists. A dashboard that reports "live" on that basis will
    claim a capability the service account may not have — which is exactly what happened when the
    account had Data Editor but not the permission to create a dataset.
    """
    global _status_cache
    if _status_cache and time.monotonic() - _status_cache[0] < _STATUS_TTL_SECONDS:
        return _status_cache[1]

    result = _probe()
    _status_cache = (time.monotonic(), result)
    return result


def _probe() -> dict:
    if not configured():
        return {"live": False, "reason": "No GOOGLE_CLOUD_PROJECT or service-account key configured.",
                "dataset": None, "tables": {}}
    try:
        from google.api_core.exceptions import Forbidden, NotFound

        client = _client()
        try:
            client.get_dataset(dataset_ref())
        except NotFound:
            return {"live": False, "dataset": dataset_ref(), "tables": {},
                    "reason": "Authenticated, but the dataset does not exist yet. Run scripts.sync_bigquery."}
        except Forbidden as e:
            return {"live": False, "dataset": dataset_ref(), "tables": {},
                    "reason": f"Authenticated, but this service account lacks BigQuery permission: {e.message}"}
        present = {t.table_id: client.get_table(t.reference).num_rows
                   for t in client.list_tables(dataset_ref())}
        return {"live": True, "dataset": dataset_ref(), "tables": present, "reason": None}
    except Exception as e:  # network, bad key, API not enabled
        return {"live": False, "dataset": dataset_ref(), "tables": {}, "reason": f"{type(e).__name__}: {e}"}


@lru_cache(maxsize=1)
def _client():
    from google.cloud import bigquery

    return bigquery.Client(project=settings.google_cloud_project)


def dataset_ref() -> str:
    return f"{settings.google_cloud_project}.{settings.bigquery_dataset}"


def ensure_dataset() -> str:
    """Create the dataset in the India region if it is not there yet."""
    from google.api_core.exceptions import Forbidden
    from google.cloud import bigquery

    ds = bigquery.Dataset(dataset_ref())
    ds.location = settings.bigquery_location
    ds.description = "Citizen demand and national development indicators, by district."
    try:
        _client().create_dataset(ds, exists_ok=True)
    except Forbidden as e:
        raise PermissionError(
            f"The service account cannot create the dataset {dataset_ref()}. Grant it the "
            f"'BigQuery User' role (Data Editor alone cannot create datasets), or create the dataset "
            f"manually in location {settings.bigquery_location}. Original error: {e}"
        ) from e
    return dataset_ref()


def upload(table: str, df: pd.DataFrame) -> int:
    """Replace a table wholesale. These are snapshots, not append-only event streams."""
    from google.cloud import bigquery

    job = _client().load_table_from_dataframe(
        df, f"{dataset_ref()}.{table}",
        job_config=bigquery.LoadJobConfig(write_disposition="WRITE_TRUNCATE"),
    )
    job.result()
    log.info("BigQuery: loaded %s rows into %s", len(df), table)
    return len(df)


def query(sql: str) -> pd.DataFrame:
    return _client().query(sql).to_dataframe()


def national_summary() -> pd.DataFrame:
    """The query a national policymaker runs: worst-served districts across every state at once.

    This is the reason BigQuery is here rather than Postgres — it scans all 640 districts × 17
    categories and ranks within each state in one pass, and the same query shape works unchanged
    when other states' pilots come online and the table is 20× bigger.
    """
    return query(f"""
        SELECT state, district, category, population,
               unique_citizens, per_100k, infrastructure_index, infrastructure_gap,
               allocated_inr_cr, priority_score, alignment_quadrant,
               RANK() OVER (PARTITION BY state ORDER BY priority_score DESC) AS rank_in_state
        FROM `{dataset_ref()}.demand_snapshot`
        WHERE unique_citizens > 0
        QUALIFY rank_in_state <= 3
        ORDER BY priority_score DESC
        LIMIT 100
    """)
