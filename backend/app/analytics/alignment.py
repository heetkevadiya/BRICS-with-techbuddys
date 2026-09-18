"""Investment alignment: is money going where demand and gaps are? (blueprint 'misaligned public spending')."""
from __future__ import annotations

import pandas as pd

QUADRANTS = {
    (True, False): "UNDERSERVED_GAP",     # high demand, low investment → top candidate for new investment
    (True, True): "COVERED_MONITOR",      # high demand, high investment → verify delivery, track impact
    (False, False): "STABLE",             # low demand, low investment → no action
    (False, True): "POSSIBLE_MISMATCH",   # low demand, high investment → review allocation
}


def add_alignment(df: pd.DataFrame) -> pd.DataFrame:
    """Percentile-rank demand pressure (adjusted per-capita demand + infra gap) against per-capita investment,
    within the state, and label the quadrant. Ranks are computed within each category so sectors with naturally
    bigger budgets (roads) are not compared with small ones (street lighting)."""
    df = df.copy()
    df["demand_pressure"] = df["adjusted_per_1000"].rank(pct=True) * 0.6 + (df["infra_gap"] / 100) * 0.4
    df["demand_rank"] = df.groupby("category_code")["demand_pressure"].rank(pct=True)
    df["invest_rank"] = df.groupby("category_code")["invest_per_capita_inr"].rank(pct=True)
    df["misalignment_index"] = ((df["demand_rank"] - df["invest_rank"]) * 100).round(1)
    df["alignment_quadrant"] = [
        QUADRANTS[(dr >= 0.5, ir >= 0.5)] if uc > 0 else ("POSSIBLE_MISMATCH" if ir >= 0.75 else "STABLE")
        for dr, ir, uc in zip(df["demand_rank"], df["invest_rank"], df["unique_citizens"])
    ]
    return df
