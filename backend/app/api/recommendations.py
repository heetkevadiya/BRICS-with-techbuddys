from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import User, get_state, require_role
from app.db.session import get_db
from app.models import Decision, DecisionType, GeographicEntity, GeoLevel, Recommendation
from app.schemas.dashboard import DecisionIn, RecommendationOut
from app.services import impact_service, recommendation_service
from app.services.ai import gemini_client

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _out(rec: Recommendation) -> RecommendationOut:
    last = sorted(rec.decisions, key=lambda d: d.created_at)[-1] if rec.decisions else None
    return RecommendationOut(
        id=rec.id, geo_id=rec.geo_id, district=rec.geo.name, category_code=rec.category_code, category=rec.category.name,
        rec_type=rec.rec_type, title=rec.title, priority_score=rec.priority_score, demand_score=rec.demand_score,
        infrastructure_gap_score=rec.infrastructure_gap_score, population_impact_score=rec.population_impact_score,
        urgency_score=rec.urgency_score, policy_alignment_score=rec.policy_alignment_score, weights=rec.weights,
        evidence=rec.evidence, alignment_quadrant=rec.alignment_quadrant, explanation=rec.explanation,
        explanation_model=rec.explanation_model, confidence=rec.confidence, computed_at=rec.computed_at,
        decision=last.decision.value if last else None,
    )


@router.get("", response_model=list[RecommendationOut])
def list_recs(db: Session = Depends(get_db), state: GeographicEntity = Depends(get_state), user: User = Depends(require_role("analyst", "policymaker")),
              district: str | None = None, category: str | None = None, rec_type: str | None = None, limit: int = Query(20, le=200)):
    q = db.query(Recommendation).join(GeographicEntity, GeographicEntity.id == Recommendation.geo_id).filter(Recommendation.is_current.is_(True), GeographicEntity.parent_id == state.id)
    if district:
        q = q.filter(GeographicEntity.name == district)
    if category:
        q = q.filter(Recommendation.category_code == category)
    if rec_type:
        q = q.filter(Recommendation.rec_type == rec_type)
    return [_out(r) for r in q.order_by(Recommendation.priority_score.desc()).limit(limit)]


@router.post("/recompute", response_model=dict)
def recompute(db: Session = Depends(get_db), state: GeographicEntity = Depends(get_state), user: User = Depends(require_role("analyst", "admin")),
              explain_top_n: int = Query(15, ge=0, le=100)):
    recs = recommendation_service.recompute(db, state.id, explain_top_n=explain_top_n)
    return {"state": state.name, "recommendations": len(recs)}


@router.get("/{rec_id}", response_model=RecommendationOut)
def get_rec(rec_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("analyst", "policymaker"))):
    rec = db.get(Recommendation, rec_id)
    if not rec:
        raise HTTPException(404, "not found")
    return _out(rec)


@router.post("/{rec_id}/explain", response_model=RecommendationOut)
def explain(rec_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("analyst", "policymaker"))):
    rec = db.get(Recommendation, rec_id)
    if not rec:
        raise HTTPException(404, "not found")
    rec.explanation = recommendation_service.explain_with_gemini(rec)
    rec.explanation_model = gemini_client.model_name()
    db.commit()
    return _out(rec)


@router.post("/{rec_id}/decision", response_model=RecommendationOut)
def decide(rec_id: int, body: DecisionIn, db: Session = Depends(get_db), user: User = Depends(require_role("policymaker"))):
    rec = db.get(Recommendation, rec_id)
    if not rec:
        raise HTTPException(404, "not found")
    db.add(Decision(recommendation_id=rec.id, policymaker_id=user.uid, decision=body.decision, note=body.note))
    if body.decision == DecisionType.ACCEPT:
        impact_service.create_baseline(db, rec)
    db.commit()
    db.refresh(rec)
    return _out(rec)


@router.get("/{rec_id}/impact")
def impact(rec_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("analyst", "policymaker"))):
    rec = db.get(Recommendation, rec_id)
    if not rec:
        raise HTTPException(404, "not found")
    result = impact_service.compare(db, rec)
    if result is None:
        raise HTTPException(404, "no baseline: the recommendation has not been accepted yet")
    return result
