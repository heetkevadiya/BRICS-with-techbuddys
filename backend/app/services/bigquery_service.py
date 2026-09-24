"""BigQuery is where the national datasets live at scale.

Postgres holds the operational, transactional world: incoming citizen requests, clusters, analyst
corrections, recommendations. That data changes constantly and is read one row at a time.

BigQuery holds the analytical world: 640 districts × 17 categories of census demographics, derived
infrastructure indices and budget lines, plus a daily snapshot of aggregated citizen demand. That is
what a national rollout queries across all 36 states at once, and what a ministry's own analysts
would join against their existing warehouse tables.

Everything degrades safely: with no credentials configured the platform runs entirely on Postgres
and `enabled()` returns False, so the dashboards never break during a demo.
"""
from __future__ import annotations

import logging
from functools import lru_cache

import pandas as pd

from app.core.config import settings

log = logging.getLogger(__name__)

TABLES = {
    "district_profile": "One row per district: census demographics and all 16 infrastructure indices.",
    "demand_snapshot": "One row per district × category: citizen demand joined to gap, budget and priority.",
}


def enabled() -> bool:
    return bool(settings.google_cloud_project and settings.credentials_path)


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
