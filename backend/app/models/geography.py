"""Configurable administrative hierarchy: Country → State → District → Taluka → Village.

Every citizen request and every government dataset joins through this table, which is what
lets one platform serve any Indian state (and, by configuration, any BRICS country).
"""
from __future__ import annotations

import enum

from geoalchemy2 import Geometry
from sqlalchemy import Enum, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class GeoLevel(str, enum.Enum):
    COUNTRY = "COUNTRY"
    STATE = "STATE"
    DISTRICT = "DISTRICT"
    SUB_DISTRICT = "SUB_DISTRICT"
    LOCALITY = "LOCALITY"


class GeographicEntity(TimestampMixin, Base):
    __tablename__ = "geographic_entities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False, index=True)
    level: Mapped[GeoLevel] = mapped_column(Enum(GeoLevel, name="geo_level"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str | None] = mapped_column(String(40), index=True)  # official code, e.g. census code
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("geographic_entities.id"))
    centroid_lat: Mapped[float | None] = mapped_column(Float)
    centroid_lng: Mapped[float | None] = mapped_column(Float)
    geom = mapped_column(Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=True)
    aliases: Mapped[str | None] = mapped_column(String(500))  # "SURAT|Surat Dist.|સુરત|सूरत"

    parent: Mapped[GeographicEntity | None] = relationship(remote_side=[id], back_populates="children")
    children: Mapped[list[GeographicEntity]] = relationship(back_populates="parent")

    __table_args__ = (Index("ix_geo_level_name", "level", "name"),)

    def __repr__(self) -> str:
        return f"<Geo {self.level.value}:{self.name}>"
