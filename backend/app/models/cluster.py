"""Many citizens describe the same underlying issue in different words. A cluster is that issue."""
from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class RequestCluster(TimestampMixin, Base):
    __tablename__ = "request_clusters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    category_code: Mapped[str] = mapped_column(ForeignKey("categories.code"), index=True)
    geo_id: Mapped[int] = mapped_column(ForeignKey("geographic_entities.id"), index=True)  # district level
    representative_problem: Mapped[str | None] = mapped_column(Text)
    centroid: Mapped[list[float] | None] = mapped_column(ARRAY(Float))
    request_count: Mapped[int] = mapped_column(Integer, default=0)
    unique_citizens: Mapped[int] = mapped_column(Integer, default=0)
    average_urgency: Mapped[float | None] = mapped_column(Float)

    requests = relationship("CitizenRequest", back_populates="cluster")
    geo = relationship("GeographicEntity")
