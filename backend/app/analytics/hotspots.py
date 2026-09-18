"""Hotspots = where request density, urgency, affected population, infrastructure gap and growth coincide."""
from __future__ import annotations

import pandas as pd


def _minmax(s: pd.Series) -> pd.Series:
    lo, hi = s.min(), s.max()
    return (s - lo) / (hi - lo) * 100 if hi > lo else s * 0


def add_hotspot_score(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    active = df["unique_citizens"] > 0
    df["hotspot_score"] = 0.0
    if active.any():
        a = df[active]
        score = (
            0.35 * _minmax(a["adjusted_per_1000"])
            + 0.20 * (a["avg_urgency"] * 10)
            + 0.15 * _minmax(a["affected_population"].pow(0.5))
            + 0.20 * a["infra_gap"]
            + 0.10 * _minmax(a["growth_pct"].clip(lower=-100, upper=300))
        )
        df.loc[active, "hotspot_score"] = score.round(1)
    return df


def top_hotspots(df: pd.DataFrame, *, category_code: str | None = None, min_citizens: int = 3, limit: int = 20) -> pd.DataFrame:
    d = df[df["unique_citizens"] >= min_citizens]
    if category_code:
        d = d[d["category_code"] == category_code]
    return d.sort_values("hotspot_score", ascending=False).head(limit)
