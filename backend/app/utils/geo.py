"""Resolve free-text place names to geographic entities using names and aliases (any script)."""
from __future__ import annotations

import re
from functools import lru_cache

from sqlalchemy.orm import Session

from app.models import GeographicEntity, GeoLevel


def _norm(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"\b(district|dist\.?|dt\.?|jilla|જિલ્લો|जिला|taluka|tal\.?)\b", "", s)
    return re.sub(r"[^\wऀ-෿]+", " ", s).strip()


class GeoResolver:
    def __init__(self, db: Session, country_code: str = "IN"):
        self.entries: list[tuple[str, GeographicEntity]] = []
        for g in db.query(GeographicEntity).filter(
            GeographicEntity.country_code == country_code,
            GeographicEntity.level.in_([GeoLevel.STATE, GeoLevel.DISTRICT]),
        ):
            names = [g.name] + ([a for a in (g.aliases or "").split("|") if a])
            for n in names:
                self.entries.append((_norm(n), g))
        # longest names first so "Gir Somnath" wins over "Somnath"-style substrings
        self.entries.sort(key=lambda t: -len(t[0]))

    def resolve(self, text: str | None, level: GeoLevel = GeoLevel.DISTRICT) -> GeographicEntity | None:
        if not text:
            return None
        t = _norm(text)
        for name, g in self.entries:
            if g.level != level or not name:
                continue
            if name == t or re.search(rf"(^|\s){re.escape(name)}(\s|$)", t):
                return g
        return None

    def resolve_in_text(self, text: str | None) -> GeographicEntity | None:
        """Scan a whole sentence for any district name/alias."""
        if not text:
            return None
        t = _norm(text)
        for name, g in self.entries:
            if g.level == GeoLevel.DISTRICT and name and re.search(rf"(^|\s){re.escape(name)}(\s|$)", t):
                return g
        return None
