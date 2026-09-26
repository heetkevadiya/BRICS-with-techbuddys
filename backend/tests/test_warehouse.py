"""Guards on the national data layer. These run against the seeded demo database."""
import pytest

from app.db.session import SessionLocal
from app.models import Category, GeographicEntity, GeoLevel
from app.services import bigquery_service as bq
from app.services.warehouse_service import build_demand_snapshot, build_district_profile


@pytest.fixture(scope="module")
def db():
    with SessionLocal() as s:
        if not s.query(GeographicEntity).filter_by(level=GeoLevel.DISTRICT).first():
            pytest.skip("demo database not seeded")
        yield s


def test_district_profile_covers_the_country(db):
    """The 'reach across India' claim has to be true in the data, not just the pitch."""
    df = build_district_profile(db)
    assert len(df) >= 600, f"only {len(df)} districts loaded"
    assert df["state"].nunique() >= 30, f"only {df['state'].nunique()} states loaded"
    assert df["population"].sum() > 1_100_000_000, "population total is below Census 2011 India"


def test_measured_indices_are_present_everywhere(db):
    """The six census-derived indices must exist for effectively every district; if a future
    refactor silently drops the census join, this catches it."""
    df = build_district_profile(db)
    for col in ("electricity_index", "water_index", "sanitation_index", "connectivity_index"):
        coverage = df[col].notna().mean()
        assert coverage > 0.95, f"{col} present for only {coverage:.0%} of districts"


def test_index_provenance_is_declared(db):
    """Every category that drives a gap calculation must say whether its index is measured."""
    for c in db.query(Category).filter(Category.infra_index_field.isnot(None)):
        assert c.index_source in ("census_2011", "modelled"), f"{c.code} has index_source {c.index_source!r}"


def test_demand_snapshot_shape(db):
    state = db.query(GeographicEntity).filter_by(level=GeoLevel.STATE, name="Gujarat").first()
    df = build_demand_snapshot(db, state.id)
    if df.empty:
        pytest.skip("no citizen requests seeded")
    assert {"state", "district", "category_code", "priority_score", "index_source"} <= set(df.columns)
    assert df["priority_score"].between(0, 100).all()
    assert (df["index_source"].isin(["census_2011", "modelled"])).all()


def test_bigquery_status_never_raises_and_explains_itself():
    """The demo must never break because a cloud service is unconfigured or unauthorised.

    This is the regression guard for a real bug: the dashboard reported BigQuery as live because
    credentials existed, while every query against it failed. Liveness must be answered by calling
    BigQuery, and a dead layer must carry a reason the UI can show instead of a bare False.
    """
    st = bq.status()
    assert {"live", "dataset", "tables", "reason"} <= set(st)
    assert isinstance(st["live"], bool)
    assert st["reason"] if not st["live"] else st["reason"] is None
