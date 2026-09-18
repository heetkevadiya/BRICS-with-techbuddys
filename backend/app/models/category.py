"""Category taxonomy is configuration, not code: a state can rename, add or localise entries."""
from __future__ import annotations

from sqlalchemy import JSON, Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Category(Base):
    __tablename__ = "categories"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    names_local: Mapped[dict] = mapped_column(JSON, default=dict)  # {"hi": "...", "gu": "..."}
    sub_categories: Mapped[list] = mapped_column(JSON, default=list)
    department: Mapped[str | None] = mapped_column(String(120))
    sdg: Mapped[list] = mapped_column(JSON, default=list)
    infra_index_field: Mapped[str | None] = mapped_column(String(40))  # column in infrastructure_indices
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
