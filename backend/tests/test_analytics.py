"""Guards on the numbers a policymaker would act on. These run against the seeded demo database."""
import pytest

from app.analytics.alignment import quadrant
from app.db.session import SessionLocal
from app.models import GeographicEntity, GeoLevel
from app.services.recommendation_service import dashboard_frame


@pytest.fixture(scope="module")
def frame():
    with SessionLocal() as db:
        state = db.query(GeographicEntity).filter_by(level=GeoLevel.STATE, name="Gujarat").first()
        if state is None:
            pytest.skip("demo database not seeded")
        df = dashboard_frame(db, state.id)
        if df.empty:
            pytest.skip("no citizen requests seeded")
        return df


def test_people_represented_never_exceeds_population(frame):
    """The bug this catches: summing the model's per-request population guesses double-counts."""
    assert (frame["affected_population"] <= frame["population"]).all()


def test_demand_is_per_capita_not_raw_counts(frame):
    """A big urban district must not outrank a small one on volume alone."""
    top = frame.sort_values("priority_score", ascending=False).head(10)
    assert top["population"].min() < frame["population"].max(), "only the largest districts surfaced — demand is not per-capita"


def test_scores_are_in_range(frame):
    for col in ("demand_score", "infrastructure_gap_score", "population_impact_score", "urgency_component",
                "policy_alignment_score", "priority_score", "hotspot_score"):
        assert frame[col].between(0, 100).all(), f"{col} out of 0–100"


def test_quadrant_rules():
    assert quadrant(0.9, 0.2, 10) == "UNDERSERVED_GAP"      # loud citizens, no money
    assert quadrant(0.9, 0.9, 10) == "COVERED_MONITOR"      # loud citizens, money is there
    assert quadrant(0.1, 0.9, 0) == "POSSIBLE_MISMATCH"     # quiet, heavy spending
    assert quadrant(0.5, 0.5, 5) == "BALANCED"
    assert quadrant(0.3, 0.8, 0) == "BALANCED", "borderline gap must not be called a mismatch"


def test_no_demand_means_no_priority(frame):
    silent = frame[frame["unique_citizens"] == 0]
    if not silent.empty:
        assert (silent["priority_score"] == 0).all(), "priority without any citizen demand"
