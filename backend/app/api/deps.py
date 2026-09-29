"""Auth & common dependencies. Firebase ID tokens when configured; in development a demo header selects the role."""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import GeographicEntity, GeoLevel

ROLES = ("citizen", "analyst", "policymaker", "admin")


@dataclass
class User:
    uid: str
    role: str
    name: str | None = None


def _verify_firebase(token: str) -> User:
    import firebase_admin
    from firebase_admin import auth as fb_auth

    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id} if settings.firebase_project_id else None)
    claims = fb_auth.verify_id_token(token)
    return User(uid=claims["uid"], role=claims.get("role", "citizen"), name=claims.get("name"))


def current_user(authorization: str | None = Header(None), x_demo_role: str | None = Header(None),
                 x_demo_user: str | None = Header(None)) -> User:
    if authorization and authorization.lower().startswith("bearer "):
        try:
            return _verify_firebase(authorization.split(" ", 1)[1])
        except Exception as e:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"invalid token: {e}")
    if settings.role_switching and x_demo_role in ROLES:
        return User(uid=x_demo_user or f"demo-{x_demo_role}", role=x_demo_role, name=x_demo_user)
    return User(uid="anonymous", role="citizen")


def require_role(*roles: str):
    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles and user.role != "admin":
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"requires role {roles}")
        return user
    return dep


def get_state(state: str | None = Query(None, description="State name, defaults to configured state"),
              db: Session = Depends(get_db)) -> GeographicEntity:
    name = state or settings.default_state
    g = db.query(GeographicEntity).filter_by(level=GeoLevel.STATE, name=name).first()
    if not g:
        raise HTTPException(404, f"state '{name}' not loaded")
    return g
