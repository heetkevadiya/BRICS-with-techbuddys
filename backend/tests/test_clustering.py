"""Guards on the issue-clustering layer.

The stored counts on a cluster are what the dashboard reads, so they have to agree with the rows
that actually point at it. They did not: the session runs with autoflush=False, so the count query
inside refresh_cluster_stats ran before the new request's cluster_id reached the database and the
cluster stayed one report short.
"""
import pytest
from sqlalchemy import text

from app.db.session import SessionLocal
from app.models import RequestCluster


@pytest.fixture(scope="module")
def db():
    with SessionLocal() as s:
        if not s.query(RequestCluster).first():
            pytest.skip("demo database not seeded")
        yield s


def test_stored_cluster_counts_match_their_rows(db):
    stale = db.execute(text("""
        select c.id, c.request_count,
               (select count(*) from citizen_requests r where r.cluster_id = c.id and r.is_flagged = false) as actual
        from request_clusters c
        where c.request_count <> (select count(*) from citizen_requests r
                                  where r.cluster_id = c.id and r.is_flagged = false)
        limit 5""")).fetchall()
    assert not stale, f"cluster counts disagree with their rows: {stale}"


def test_unique_citizens_never_exceeds_request_count(db):
    bad = db.execute(text("""
        select id, unique_citizens, request_count from request_clusters
        where unique_citizens > request_count limit 5""")).fetchall()
    assert not bad, f"more unique citizens than requests: {bad}"
