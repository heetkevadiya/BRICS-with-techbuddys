"""Group requests into issues. New request → nearest cluster centroid in the same district × category
(cosine ≥ threshold) → join it, else start a new cluster. Duplicates from the same citizen are linked, not deleted."""
from __future__ import annotations

from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import CitizenRequest, RequestCluster
from app.utils.vectors import cosine, mean_vector

SIMILARITY_THRESHOLD = 0.78
DUPLICATE_WINDOW_DAYS = 14


def assign_cluster(db: Session, req: CitizenRequest) -> RequestCluster | None:
    if req.embedding is None or req.resolved_geo_id is None or req.category_code is None:
        return None
    candidates = db.query(RequestCluster).filter_by(geo_id=req.resolved_geo_id, category_code=req.category_code).all()
    best, best_sim = None, 0.0
    for c in candidates:
        if c.centroid:
            sim = cosine(req.embedding, c.centroid)
            if sim > best_sim:
                best, best_sim = c, sim
    if best is None or best_sim < SIMILARITY_THRESHOLD:
        best = RequestCluster(
            name=(req.sub_category or req.problem_description or "Issue")[:160].capitalize(),
            category_code=req.category_code, geo_id=req.resolved_geo_id,
            representative_problem=req.problem_description, centroid=req.embedding,
        )
        db.add(best)
        db.flush()
    req.cluster_id = best.id
    db.flush()
    _link_duplicate(db, req, best)
    refresh_cluster_stats(db, best)
    return best


def _link_duplicate(db: Session, req: CitizenRequest, cluster: RequestCluster) -> None:
    if not req.citizen_hash:
        return
    earlier = (
        db.query(CitizenRequest)
        .filter(CitizenRequest.cluster_id == cluster.id, CitizenRequest.citizen_hash == req.citizen_hash,
                CitizenRequest.id != req.id, CitizenRequest.submitted_at >= req.submitted_at - timedelta(days=DUPLICATE_WINDOW_DAYS))
        .order_by(CitizenRequest.submitted_at)
        .first()
    )
    if earlier:
        req.duplicate_of_id = earlier.duplicate_of_id or earlier.id


def refresh_cluster_stats(db: Session, cluster: RequestCluster, recompute_centroid: bool = False) -> None:
    q = db.query(CitizenRequest).filter(CitizenRequest.cluster_id == cluster.id, CitizenRequest.is_flagged.is_(False))
    cluster.request_count = q.count()
    cluster.unique_citizens = q.with_entities(func.count(func.distinct(func.coalesce(CitizenRequest.citizen_hash, func.cast(CitizenRequest.id, __import__("sqlalchemy").String))))).scalar() or 0
    cluster.average_urgency = q.with_entities(func.avg(CitizenRequest.urgency_score)).scalar()
    if recompute_centroid:
        vecs = [r.embedding for r in q.with_entities(CitizenRequest.embedding) if r.embedding]
        if vecs:
            cluster.centroid = mean_vector(vecs)
