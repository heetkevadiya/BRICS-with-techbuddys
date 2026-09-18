"""Audit trail of every analyst action on an AI result: who, what, when, old, new, why."""
from __future__ import annotations

import enum

from sqlalchemy import JSON, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class VerificationAction(str, enum.Enum):
    APPROVE = "APPROVE"
    CORRECT = "CORRECT"
    REJECT = "REJECT"


class Verification(TimestampMixin, Base):
    __tablename__ = "verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("citizen_requests.id"), index=True)
    analyst_id: Mapped[str] = mapped_column(String(120), nullable=False)
    action: Mapped[VerificationAction] = mapped_column(Enum(VerificationAction, name="verification_action"))
    field_name: Mapped[str | None] = mapped_column(String(60))
    old_value: Mapped[dict | None] = mapped_column(JSON)
    new_value: Mapped[dict | None] = mapped_column(JSON)
    reason: Mapped[str | None] = mapped_column(Text)

    request = relationship("CitizenRequest", back_populates="verifications")
