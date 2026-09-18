"""Analyst supervision of AI output. Every change is recorded with old value, new value, who, when and why."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import CitizenRequest, ProcessingStatus, Verification, VerificationAction, VerificationStatus
from app.services import clustering_service

CORRECTABLE = {"category_code", "sub_category", "urgency_score", "problem_description", "resolved_geo_id", "cluster_id"}


def apply(db: Session, req: CitizenRequest, *, analyst_id: str, action: VerificationAction,
          corrections: dict | None = None, reason: str | None = None) -> CitizenRequest:
    corrections = {k: v for k, v in (corrections or {}).items() if k in CORRECTABLE}
    if action == VerificationAction.CORRECT and not corrections:
        raise ValueError("CORRECT requires at least one correctable field")

    if action == VerificationAction.CORRECT:
        recluster = False
        for field, new in corrections.items():
            old = getattr(req, field)
            if old == new:
                continue
            db.add(Verification(request_id=req.id, analyst_id=analyst_id, action=action, field_name=field,
                                old_value={"value": old}, new_value={"value": new}, reason=reason))
            setattr(req, field, new)
            recluster |= field in ("category_code", "resolved_geo_id")
        req.verification_status = VerificationStatus.CORRECTED
        req.processing_status = ProcessingStatus.PROCESSED
        if recluster and req.embedding is not None:
            old_cluster = req.cluster
            req.cluster_id = None
            clustering_service.assign_cluster(db, req)
            if old_cluster is not None:
                clustering_service.refresh_cluster_stats(db, old_cluster)
    else:
        db.add(Verification(request_id=req.id, analyst_id=analyst_id, action=action, reason=reason))
        if action == VerificationAction.APPROVE:
            req.verification_status = VerificationStatus.APPROVED
            req.processing_status = ProcessingStatus.PROCESSED
        else:
            req.verification_status = VerificationStatus.REJECTED
            req.is_flagged = True
            if req.cluster is not None:
                clustering_service.refresh_cluster_stats(db, req.cluster)
    db.flush()
    return req
